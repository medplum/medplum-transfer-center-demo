import { Container } from '@mantine/core';
import { createReference, resolveId } from '@medplum/core';
import { Practitioner, Questionnaire, QuestionnaireResponse, Reference, ServiceRequest } from '@medplum/fhirtypes';
import { Loading, QuestionnaireForm, useMedplum, useMedplumNavigate, useResource } from '@medplum/react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ACCEPTING_PHYSICIAN_INTAKE_QUESTIONNAIRE_ID } from '@/lib/common';

export function SupplementaryQuestionnairePage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useMedplumNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();

  const serviceRequest = useResource<ServiceRequest>({ reference: `ServiceRequest/${id}` });

  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Reference<Questionnaire>>();

  // Determine the context based on the URL path
  const getQuestionnaireData = useCallback(() => {
    let query: string | undefined = undefined,
      display: string | undefined = undefined;

    if (!serviceRequest) {
      return { query, display };
    }

    if (pathname.includes('/practitioner-supplement') && serviceRequest.performer?.length) {
      query = `context=${resolveId(serviceRequest.performer[0] as Reference<Practitioner>)}`;
      display = 'Physician Supplementary Intake Questionnaire';
    }

    if (pathname.includes('/accepting-physician-supplement')) {
      query = `_id=${ACCEPTING_PHYSICIAN_INTAKE_QUESTIONNAIRE_ID}`;
      display = 'Accepting Physician Supplementary Intake Questionnaire';
    }

    return { query, display };
  }, [serviceRequest, pathname]);

  const { query, display } = getQuestionnaireData();
  useEffect(() => {
    if (!serviceRequest) {
      return;
    }

    // FIXME: Check if the questionnaire has already been filled out based on the path
    // If this questionnaire has already been filled out or if performer is empty (the accepting
    // physician may not have been assigned yet), redirect to the ServiceRequest page for this referral
    // if (serviceRequest?.supportingInfo?.[1] || !serviceRequest.performer) {
    //   navigate(`/ServiceRequest/${serviceRequest.id as string}`);
    //   return;
    // }

    medplum
      .searchOne('Questionnaire', query)
      .then((questionnaire) => {
        if (!questionnaire) {
          // console.debug(`No questionnaire for given performer: ${serviceRequest.performer}`);
          console.debug(`No questionnaire found for query: ${query}`);
          // If no questionnaire to fill out, redirect to ServiceRequest page for this referral
          navigate(`/ServiceRequest/${serviceRequest.id as string}`);
          return;
        }
        setCurrentQuestionnaire(createReference<Questionnaire>(questionnaire));
      })
      .catch(console.error);
  }, [medplum, navigate, id, serviceRequest, query]);

  const handleSubmit = useCallback(
    (response: QuestionnaireResponse) => {
      if (!serviceRequest || !currentQuestionnaire?.reference) {
        return;
      }
      medplum
        .createResource({ ...response })
        .then(async (completedResponse) => {
          await medplum.patchResource('ServiceRequest', serviceRequest.id as string, [
            {
              op: 'add',
              path: '/supportingInfo/1',
              value: { ...createReference(completedResponse), display: display },
            },
          ]);
          navigate(`/ServiceRequest/${serviceRequest.id as string}`);
          return;
        })
        .catch(console.error);
    },
    [serviceRequest, currentQuestionnaire?.reference, medplum, display, navigate]
  );

  return (
    <Container fluid>
      {serviceRequest && currentQuestionnaire ? (
        <QuestionnaireForm
          subject={createReference(serviceRequest)}
          questionnaire={currentQuestionnaire}
          onSubmit={handleSubmit}
        />
      ) : (
        <Loading />
      )}
    </Container>
  );
}
