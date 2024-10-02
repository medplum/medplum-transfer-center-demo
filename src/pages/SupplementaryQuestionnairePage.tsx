import { Container } from '@mantine/core';
import { createReference } from '@medplum/core';
import { Questionnaire, QuestionnaireResponse, Reference, ServiceRequest } from '@medplum/fhirtypes';
import { Loading, QuestionnaireForm, useMedplum, useMedplumNavigate, useResource } from '@medplum/react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getSupplementaryQuestionnaireContext } from '@/utils/getSupplementaryQuestionnaireContext';

export function SupplementaryQuestionnairePage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useMedplumNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();

  const serviceRequest = useResource<ServiceRequest>({ reference: `ServiceRequest/${id}` });

  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Reference<Questionnaire>>();

  const { query, isResponseAvailable, display } = getSupplementaryQuestionnaireContext(serviceRequest, pathname);

  useEffect(() => {
    if (!serviceRequest) {
      return;
    }

    // If this questionnaire has already been filled out, redirect to the ServiceRequest page
    // for this referral
    if (isResponseAvailable) {
      navigate(`/ServiceRequest/${serviceRequest.id as string}`);
      return;
    }

    medplum
      .searchOne('Questionnaire', query)
      .then((questionnaire) => {
        if (!questionnaire) {
          console.debug(`No questionnaire found for query: ${query}`);
          // If no questionnaire to fill out, redirect to ServiceRequest page for this referral
          navigate(`/ServiceRequest/${serviceRequest.id as string}`);
          return;
        }
        setCurrentQuestionnaire(createReference<Questionnaire>(questionnaire));
      })
      .catch(console.error);
  }, [medplum, navigate, id, serviceRequest, isResponseAvailable, query]);

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
