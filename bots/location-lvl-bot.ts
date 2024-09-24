import { MedplumClient, BotEvent, getQuestionnaireAnswers, createReference } from '@medplum/core';
import { Location, QuestionnaireResponse } from '@medplum/fhirtypes';

export const HAYS_MED_ORG_ID = '6cd37206-891f-4783-8b31-e6fed9f70ebd';
export const HAYS_MED_LOCATION_ID = 'ba836894-122f-42d0-874b-83ea9557e4f3';
export const CREATE_LOCATION_LVL_QUESTIONNAIRE_ID = 'cd78cab0-d3b4-4b33-9df2-60289ac3ca8b';

export async function handler(medplum: MedplumClient, event: BotEvent<QuestionnaireResponse>): Promise<void> {
  const { input } = event;

  if (input.resourceType !== 'QuestionnaireResponse') {
    throw new Error('Invalid input');
  }

  if (input.questionnaire !== `Questionnaire/${CREATE_LOCATION_LVL_QUESTIONNAIRE_ID}`) {
    throw new Error('Invalid questionnaire');
  }

  const answers = getQuestionnaireAnswers(input);

  const name = answers['name']?.valueString;
  if (!name) {
    throw new Error('Missing name');
  }

  const status = answers['status']?.valueCoding?.code as Location['status'];
  if (!status) {
    throw new Error('Missing status');
  }

  const telecomPhone = answers['telecomPhone']?.valueString;

  const location: Location = {
    resourceType: 'Location',
    partOf: createReference({ resourceType: 'Location', id: HAYS_MED_LOCATION_ID }),
    managingOrganization: createReference({ resourceType: 'Organization', id: HAYS_MED_ORG_ID }),
    physicalType: {
      coding: [
        { system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'lvl', display: 'Level' },
      ],
    },
    mode: 'instance',
    name,
    status,
    telecom: telecomPhone ? [{ system: 'phone', value: telecomPhone }] : undefined,
  };
  await medplum.createResource(location);
}
