import { MedplumClient, BotEvent, getQuestionnaireAnswers, resolveId } from '@medplum/core';
import { Location, QuestionnaireResponse, Reference } from '@medplum/fhirtypes';

export const HAYS_MED_ORG_ID = '6cd37206-891f-4783-8b31-e6fed9f70ebd';
export const HAYS_MED_LOCATION_ID = 'ba836894-122f-42d0-874b-83ea9557e4f3';
export const CREATE_LOCATION_ROOM_QUESTIONNAIRE_ID = 'e82a8b16-27fa-4f34-a8cd-daacaac6fc81';

export async function handler(medplum: MedplumClient, event: BotEvent<QuestionnaireResponse>): Promise<void> {
  const { input } = event;

  if (input.resourceType !== 'QuestionnaireResponse') {
    throw new Error('Invalid input');
  }

  if (input.questionnaire !== `Questionnaire/${CREATE_LOCATION_ROOM_QUESTIONNAIRE_ID}`) {
    throw new Error('Invalid questionnaire');
  }

  const answers = getQuestionnaireAnswers(input);

  const partOf = answers['partOf']?.valueReference as Reference<Location>;
  if (!partOf) {
    throw new Error('Missing partOf');
  }

  const name = answers['name']?.valueString;
  if (!name) {
    throw new Error('Missing name');
  }

  const operationalStatus = answers['operationalStatus']?.valueCoding;
  if (!operationalStatus) {
    throw new Error('Missing operationalStatus');
  }

  const partOfLocation = await medplum.readResource('Location', resolveId(partOf) as string);

  const location: Location = {
    resourceType: 'Location',
    partOf,
    managingOrganization: partOfLocation.managingOrganization,
    physicalType: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'ro', display: 'Room' }],
    },
    mode: 'instance',
    name: `${partOfLocation.name} ${name}`,
    alias: [name],
    description: `Room ${name} on ${partOfLocation.name}`,
    operationalStatus,
    telecom: partOfLocation.telecom,
  };
  await medplum.createResource(location);
}
