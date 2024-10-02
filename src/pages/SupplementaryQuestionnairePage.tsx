import { Container } from '@mantine/core';
import { createReference } from '@medplum/core';
import { QuestionnaireResponse, ServiceRequest } from '@medplum/fhirtypes';
import { Loading, QuestionnaireForm, useMedplum, useMedplumNavigate, useResource } from '@medplum/react';
import { useCallback, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useSupplementaryQuestionnaireContext } from '@/hooks/useSupplementaryQuestionnaireContext';

export function SupplementaryQuestionnairePage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useMedplumNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();

  const serviceRequest = useResource<ServiceRequest>({ reference: `ServiceRequest/${id}` });

  const { questionnaire, isAcceptingResponse, display } = useSupplementaryQuestionnaireContext(
    serviceRequest,
    pathname
  );

  useEffect(() => {
    if (!serviceRequest) {
      return;
    }

    if (!isAcceptingResponse()) {
      navigate(`/ServiceRequest/${serviceRequest.id as string}`);
    }
  }, [isAcceptingResponse, navigate, serviceRequest]);

  const handleSubmit = useCallback(
    async (response: QuestionnaireResponse) => {
      if (!serviceRequest || !questionnaire) {
        return;
      }

      try {
        const completedResponse = await medplum.createResource({ ...response });
        await medplum.patchResource('ServiceRequest', serviceRequest.id as string, [
          {
            op: 'add',
            path: '/supportingInfo/-',
            value: { ...createReference(completedResponse), display },
          },
        ]);
        navigate(`/ServiceRequest/${serviceRequest.id}`);
      } catch (error) {
        console.error(error);
      }
    },
    [display, medplum, navigate, questionnaire, serviceRequest]
  );

  return (
    <Container fluid>
      {serviceRequest && questionnaire ? (
        <QuestionnaireForm
          subject={createReference(serviceRequest)}
          questionnaire={createReference(questionnaire)}
          onSubmit={handleSubmit}
        />
      ) : (
        <Loading />
      )}
    </Container>
  );
}
