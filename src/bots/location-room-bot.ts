import { CREATE_LOCATION_ROOM_QUESTIONNAIRE_ID } from '@/constants';
import { MedplumClient, BotEvent, getQuestionnaireAnswers, resolveId } from '@medplum/core';
import { Location, QuestionnaireResponse, Reference } from '@medplum/fhirtypes';

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
    managingOrganization: partOfLocation.managingOrganization,
    partOf,
    status: 'active',
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
