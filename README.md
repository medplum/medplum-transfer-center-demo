[![Build](https://github.com/HaysMed/haysmed-regional-portal/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/HaysMed/haysmed-regional-portal/actions/workflows/build.yml)

# HaysMed Regional Portal

This repo is for the HaysMed regional portal. Currently this portal includes a dashboard for the HaysMed transfer center, as well as patient intake, and physician onboarding for the portal.

## Repo Overview

TODO: Enumerate bots, scripts and their use cases, important custom components such as the , etc.

## Data Model

### Locations

The [`Location` FHIR resource](https://hl7.org/fhir/r4/location.html) is used to model the hierarchy of locations within the data model. We have three levels of nesting in the current model:

1. Building
2. Level (or ward)
3. Room

Each `Location` has a `type` (eg. building, level, room) and can be "part of" another `Location` resource. We use this `partOf` field to represent that a lower-level location is located within the higher-level location that it is "part of".

For example, the room `ACUTE 212` is "part of" the `ACUTE` level, which is in turn "part of" the `HaysMed` hospital building.

This is how that looks hierarchically from the perspective of the FHIR model:

#### HaysMed [Location.type=building, Location.partOf is empty]

- **ACUTE [Location.type=level, Location.partOf=HaysMed]**
  - ACUTE 212
    - Location.type=room
    - **Location.partOf=ACUTE**
    - Location.alias=212
  - ACUTE 213
    - Location.type=room
    - **Location.partOf=ACUTE**
    - Location.alias=213
  - ...other rooms in ACUTE
- **3SURG [Location.type=level, Location.partOf=HaysMed]**
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

This model allows us to use [FHIR search semantics](https://www.hl7.org/fhir/search.html) to search for rooms which are "part of" the `ACUTE` or `3SURG` ward, or query for all levels that are of "part of" the `HaysMed` hospital building.

Note that along with each location, we also denote an "alias" which is just the room number. This allows us to search for just the room number more directly while still displaying the full `Location.name` (eg. `3SURG 307`) by default for the user when facilitating things like user type-aheads in inputs or displaying locations in a table cell.

---

TODO: Include notes about other parts of the data model

## Development

To run the development server for this app, type the following in your console of choice:

```bash
npm run dev
```

This will host the Vite development server locally, which by default should be hosted on port 3000.

## Building for production

To build the app, run:

```bash
npm run build
```
