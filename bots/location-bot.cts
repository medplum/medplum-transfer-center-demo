import { MedplumClient, BotEvent, getQuestionnaireAnswers } from '@medplum/core';
import { QuestionnaireResponse } from '@medplum/fhirtypes';

const HAYS_MED_ORG_ID = '6cd37206-891f-4783-8b31-e6fed9f70ebd';

type LocationLinkId = 'name' | 'description' | 'status' | 'operationalStatus' | 'telecomPhone';

export async function handler(medplum: MedplumClient, event: BotEvent<QuestionnaireResponse>): Promise<void> {
  if (event.input?.resourceType !== 'QuestionnaireResponse') {
    throw new Error('Invalid input');
  }

  const answers = getQuestionnaireAnswers(event.input);
}
