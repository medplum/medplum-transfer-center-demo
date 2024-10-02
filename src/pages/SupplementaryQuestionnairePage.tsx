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

    const fetchQuestionnaire = async () => {
      try {
        const questionnaire = await medplum.searchOne('Questionnaire', query);
        // If no questionnaire to fill out, redirect to ServiceRequest page for this referral
        if (!questionnaire) {
          console.debug(`No questionnaire found for query: ${query}`);
          navigate(`/ServiceRequest/${serviceRequest.id}`);
          return;
        }
        setCurrentQuestionnaire(createReference<Questionnaire>(questionnaire));
      } catch (error) {
        console.error(error);
      }
    };

    fetchQuestionnaire();
  }, [medplum, navigate, id, serviceRequest, isResponseAvailable, query]);

  const handleSubmit = useCallback(
    async (response: QuestionnaireResponse) => {
      if (!serviceRequest || !currentQuestionnaire?.reference) {
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
