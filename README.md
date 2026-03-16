<h1 align="center">Medplum Transfer Center</h1>
<p align="center">An open-source hospital transfer center portal built on the Medplum platform.</p>
<p align="center">
  <a href="https://github.com/medplum/medplum-transfer-center-demo/actions">
    <img src="https://github.com/medplum/medplum-transfer-center-demo/actions/workflows/build.yml/badge.svg" />
  </a>
  <a href="https://github.com/medplum/medplum-transfer-center-demo/blob/main/LICENSE.txt">
    <img src="https://img.shields.io/badge/license-Apache-blue.svg" />
  </a>
</p>

### What is the Medplum Transfer Center?

The Medplum Transfer Center is a **hospital transfer center demo app**. It provides a portal for managing patient transfers between facilities, including a transfer center dashboard, patient intake, and physician onboarding. It is meant for developers to clone, customize, and run.

### Features

- Open-source
- [Medplum](https://www.medplum.com) backend, which is also open source
- Transfer center dashboard for managing incoming patient transfers
- Patient intake workflow via FHIR Questionnaires
- Physician onboarding for accepting transfer requests
- Hospital location management (buildings, wards, rooms)
- Real-time HL7 ADT message processing via Medplum Agent
- Automated bed assignment workflows
- All data represented in [FHIR](https://hl7.org/FHIR/)

## Repo Overview

| Directory / File            | Purpose                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/`                      | React application source code (pages, components, hooks, utils)                                                                               |
| `src/bots/`                 | Medplum bots for automating FHIR resource creation and HL7 parsing                                                                            |
| `data/core/`                | Project fixture — FHIR bundle data (CodeSystems, ValueSets, Questionnaires) that must be uploaded to Medplum in order to properly run the app |
| `scripts/`                  | Utility scripts for deploying bots and sending ADT messages                                                                                   |
| `data/core/agent-data.json` | Medplum Agent and Endpoint resource definitions                                                                                               |

## Data Model

### Locations

The [`Location` FHIR resource](https://hl7.org/fhir/r4/location.html) is used to model the hierarchy of locations within the data model. We have three levels of nesting in the current model:

1. Building
2. Level (or ward)
3. Room

Each `Location` has a `type` (eg. building, level, room) and can be "part of" another `Location` resource. We use this `partOf` field to represent that a lower-level location is located within the higher-level location that it is "part of".

For example, the room `ACUTE 212` is "part of" the `ACUTE` level, which is in turn "part of" the hospital building.

This is how that looks hierarchically from the perspective of the FHIR model:

#### Hospital [Location.type=building, Location.partOf is empty]

- **ACUTE [Location.type=level, Location.partOf=Hospital]**
  - ACUTE 212
    - Location.type=room
    - **Location.partOf=ACUTE**
    - Location.alias=212
  - ACUTE 213
    - Location.type=room
    - **Location.partOf=ACUTE**
    - Location.alias=213
  - ...other rooms in ACUTE
- **3SURG [Location.type=level, Location.partOf=Hospital]**
  - 3SURG 307
    - Location.type=room
    - **Location.partOf=3SURG**
    - Location.alias=307
  - 3SURG 308
    - Location.type=room
    - **Location.partOf=3SURG**
    - Location.alias=308
  - ...other rooms in 3SURG
- ...other wards of the hospital

This model allows us to use [FHIR search semantics](https://www.hl7.org/fhir/search.html) to search for rooms which are "part of" the `ACUTE` or `3SURG` ward, or query for all levels that are of "part of" the `Hospital` hospital building.

Note that along with each location, we also denote an "alias" which is just the room number. This allows us to search for just the room number more directly while still displaying the full `Location.name` (eg. `3SURG 307`) by default for the user when facilitating things like user type-aheads in inputs or displaying locations in a table cell.

## Getting Started

First, [fork](https://github.com/medplum/medplum-transfer-center-demo/fork) and clone the repo.

Next, install the app from your terminal:

```bash
npm install
```

### Environment Setup

Copy the example environment file and fill in your Medplum project credentials:

```bash
cp .env.example .env
```

| Variable                        | Description                                        |
| ------------------------------- | -------------------------------------------------- |
| `VITE_MEDPLUM_PROJECT_ID`       | Your Medplum project ID (used by the frontend)     |
| `VITE_MEDPLUM_GOOGLE_CLIENT_ID` | Google OAuth client ID for login (optional)        |
| `MEDPLUM_CLIENT_ID`             | Medplum client ID for bot deployment scripts       |
| `MEDPLUM_CLIENT_SECRET`         | Medplum client secret for bot deployment scripts   |
| `DEPLOY_MEDPLUM_CLIENT_ID`      | Medplum client ID used during CI/CD deployment     |
| `DEPLOY_MEDPLUM_CLIENT_SECRET`  | Medplum client secret used during CI/CD deployment |

Then, run the app:

```bash
npm run dev
```

This app should run on `http://localhost:3000/`

## Building for Production

To build the app, run:

```bash
npm run build
```

## Upserting Core Data

To upsert the core data into the Medplum server, run:

```bash
npx medplum post '' "$(cat path/to/bundle.json)"
# Example: npx medplum post '' "$(cat data/core/core-data.json)"
```

### Core Data

The core data for the Transfer Center is stored in the `data/core` directory. This data is used to populate the Medplum server with the necessary resources for the portal to function. The core data includes the following resources:

| Resource Type | Name                                     |
| ------------- | ---------------------------------------- |
| CodeSystem    | call-dispositions                        |
| ValueSet      | accepting-specialties                    |
| ValueSet      | call-dispositions                        |
| ValueSet      | starting-locations                       |
| ValueSet      | time-sensitive-diagnosis                 |
| ValueSet      | transferring-origins                     |
| Questionnaire | accepting-physician-intake-questionnaire |
| Questionnaire | create-location-lvl-questionnaire        |
| Questionnaire | create-location-ro-questionnaire         |
| Questionnaire | patient-bed-assignment-questionnaire     |
| Questionnaire | patient-intake-questionnaire             |
| Questionnaire | physician-onboarding-questionnaire       |

## Bots

Bots are server-side TypeScript functions that run on the Medplum platform. Each user-facing workflow is driven by a FHIR Questionnaire — when a user submits a form, Medplum fires a FHIR Subscription that invokes the corresponding bot. The ADT processing bot is the exception: it is triggered directly by the Medplum Agent when an HL7 v2 ADT message arrives over MLLP.

| Bot | Trigger |
| --- | ------- |
| `patient-intake-bot` | Patient transfer form submitted |
| `accepting-physician-intake-bot` | Accepting physician form submitted |
| `patient-bed-assignment-bot` | Bed assignment form submitted |
| `physician-onboarding-bot` | Physician onboarding form submitted |
| `location-lvl-bot` | Create ward form submitted |
| `location-room-bot` | Create room form submitted |
| `adt-processing-bot` | HL7 ADT message received via Medplum Agent |

To build and deploy the bots:

```bash
npm run bots:build
npm run bots:deploy
```

## Running Commands Locally

### Medplum Agent

The Medplum Agent is required to receive HL7 messages. To run the agent locally, follow the instructions in the [Medplum Agent documentation](https://www.medplum.com/docs/agent).

Once the agent is running, you can send ADT messages using the provided script to test the sample application:

```bash
npm run send-adt <MESSAGE_TYPE> <ROOM_NUMBER>
```

Available message types:

- `A01` - Patient admission
- `A03` - Patient discharge

Example:

```bash
npm run send-adt A01 201  # Admit patient to room 201
npm run send-adt A03 201  # Discharge patient from room 201
```

## Account Setup

By default, your locally running Transfer Center app points to the hosted Medplum service. To use your own organization's Medplum project, [register a new Project on Medplum](https://www.medplum.com/docs/tutorials/register) and configure your environment variables accordingly (see [config.ts](src/config.ts)).

If you are using the Medplum Hosted service, you can log in to your Medplum instance and add the following identifiers to your [Project Site Settings](https://app.medplum.com/admin/sites):

- Google Client Id
- Google Client Secret
- Recaptcha Site Key
- Recaptcha Secret Key

Contact the Medplum team ([support@medplum.com](mailto:support@medplum.com) or [Discord](https://discord.gg/medplum)) with any questions.

## About Medplum

[Medplum](https://www.medplum.com/) is an open-source, API-first EHR.

Medplum supports self-hosting and provides a [hosted service](https://app.medplum.com/).

- Read our [documentation](https://www.medplum.com/docs/)
- Browse our [React component library](https://storybook.medplum.com/)
- Join our [Discord](https://discord.gg/medplum)
