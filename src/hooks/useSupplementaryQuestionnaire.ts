import { resolveId } from '@medplum/core';
import { Practitioner, Questionnaire, Reference, ServiceRequest } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback } from 'react';
import { ACCEPTING_PHYSICIAN_INTAKE_QUESTIONNAIRE_ID } from '@/lib/common';

export function useSupplementaryQuestionnaire(
  serviceRequest: ServiceRequest,
  type: 'acceptingPhysician' | 'practitioner'
): {
  fetchQuestionnaire: () => Promise<Questionnaire | undefined>;
  isAcceptingResponse: () => Promise<boolean>;
  getDisplay: () => string | undefined;
} {
  const medplum = useMedplum();

  const getDisplay = useCallback(() => {
    if (type === 'practitioner' && serviceRequest.performer?.length) {
      return 'Physician Supplementary Intake Questionnaire';
    } else if (type === 'acceptingPhysician') {
      return 'Accepting Physician Supplementary Intake Questionnaire';
    }
    return undefined;
  }, [serviceRequest, type]);

  const fetchQuestionnaire = useCallback(async () => {
    try {
      let query: string | undefined;
      if (type === 'practitioner' && serviceRequest.performer?.length) {
        query = `context=${resolveId(serviceRequest.performer[0] as Reference<Practitioner>)}`;
      } else if (type === 'acceptingPhysician') {
        query = `_id=${ACCEPTING_PHYSICIAN_INTAKE_QUESTIONNAIRE_ID}`;
      }
      // Return undefined, otherwise the searchOne will retrieve a questionnaire
      if (!query) {
        return undefined;
      }

      const fetchedQuestionnaire = await medplum.searchOne('Questionnaire', query);
      return fetchedQuestionnaire;
    } catch (error) {
      console.error(error);
    }
  }, [medplum, serviceRequest, type]);

  const isAcceptingResponse = useCallback(async () => {
    const questionnaire = await fetchQuestionnaire();

    if (!serviceRequest || !questionnaire) {
      return false;
    }

    if (questionnaire) {
      return !serviceRequest?.supportingInfo?.some((info) => info?.display === getDisplay());
    }

    return false;
  }, [fetchQuestionnaire, getDisplay, serviceRequest]);

  return { fetchQuestionnaire, isAcceptingResponse, getDisplay };
}
