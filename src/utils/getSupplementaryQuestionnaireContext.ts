import { resolveId } from '@medplum/core';
import { Practitioner, Reference, ServiceRequest } from '@medplum/fhirtypes';
import { ACCEPTING_PHYSICIAN_INTAKE_QUESTIONNAIRE_ID } from '@/lib/common';

export function getSupplementaryQuestionnaireContext(
  serviceRequest: ServiceRequest | undefined,
  pathname: string | undefined
): {
  query: string | undefined;
  display: string | undefined;
  isResponseAvailable: boolean | undefined;
} {
  let query: string | undefined = undefined,
    display: string | undefined = undefined,
    isResponseAvailable: boolean | undefined = false;

  if (!serviceRequest || !pathname) {
    return { query, display, isResponseAvailable };
  }

  if (pathname.includes('/practitioner-supplement') && serviceRequest.performer?.length) {
    query = `context=${resolveId(serviceRequest.performer[0] as Reference<Practitioner>)}`;
    display = 'Physician Supplementary Intake Questionnaire';
  }

  if (pathname.includes('/accepting-physician-supplement')) {
    query = `_id=${ACCEPTING_PHYSICIAN_INTAKE_QUESTIONNAIRE_ID}`;
    display = 'Accepting Physician Supplementary Intake Questionnaire';
  }

  isResponseAvailable = serviceRequest.supportingInfo?.some((info) => info?.display === display);
  return { query, display, isResponseAvailable };
}
