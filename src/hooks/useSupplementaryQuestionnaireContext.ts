import { resolveId } from '@medplum/core';
import { Practitioner, Questionnaire, Reference, ServiceRequest } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ACCEPTING_PHYSICIAN_INTAKE_QUESTIONNAIRE_ID } from '@/lib/common';

export function useSupplementaryQuestionnaireContext(
  serviceRequest: ServiceRequest | undefined,
  pathname: string | undefined
): {
  questionnaire: Questionnaire | undefined;
  fetchQuestionnaire: () => Promise<Questionnaire | undefined>;
  isAcceptingResponse: () => boolean;
  display: string | undefined;
} {
  const medplum = useMedplum();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | undefined>(undefined);

  const { query, display } = useMemo(() => {
    if (!serviceRequest || !pathname) {
      return { query: undefined, display: undefined };
    }

    let query: string | undefined;
    let display: string | undefined;

    if (pathname.includes('/practitioner-supplement') && serviceRequest.performer?.length) {
      query = `context=${resolveId(serviceRequest.performer[0] as Reference<Practitioner>)}`;
      display = 'Physician Supplementary Intake Questionnaire';
    } else if (pathname.includes('/accepting-physician-supplement')) {
      query = `_id=${ACCEPTING_PHYSICIAN_INTAKE_QUESTIONNAIRE_ID}`;
      display = 'Accepting Physician Supplementary Intake Questionnaire';
    }

    return { query, display };
  }, [serviceRequest, pathname]);

  const fetchQuestionnaire = useCallback(async () => {
    if (!query) {
      return;
    }

    try {
      const fetchedQuestionnaire = await medplum.searchOne('Questionnaire', query);
      setQuestionnaire(fetchedQuestionnaire);
      return fetchedQuestionnaire;
    } catch (error) {
      console.error(error);
    }
  }, [medplum, query]);

  useEffect(() => {
    if (query) {
      fetchQuestionnaire();
    }
  }, [fetchQuestionnaire, query]);

  // FIXME: Return False if it's the practitioner questionnaire and the service request already has a performer
  const isAcceptingResponse = useCallback((): boolean => {
    if (!query) {
      return false;
    }
    if (questionnaire) {
      return !serviceRequest?.supportingInfo?.some((info) => info?.display === display);
    }
    return true;
  }, [query, questionnaire, serviceRequest, display]);

  return { questionnaire, fetchQuestionnaire, isAcceptingResponse, display };
}
