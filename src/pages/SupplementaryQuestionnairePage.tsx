import { Container } from '@mantine/core';
import { createReference, resolveId } from '@medplum/core';

import { Practitioner, Questionnaire, QuestionnaireResponse, Reference, ServiceRequest } from '@medplum/fhirtypes';
import { Loading, QuestionnaireForm, useMedplum, useMedplumNavigate, useResource } from '@medplum/react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export function SupplementaryQuestionnairePage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useMedplumNavigate();
  const { id } = useParams();

  const serviceRequest = useResource<ServiceRequest>({ reference: `ServiceRequest/${id}` });

  console.log({ serviceRequest });
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Reference<Questionnaire>>();

  useEffect(() => {
    if (!serviceRequest) {
      return;
    }
    if (!serviceRequest.performer) {
      console.error(`Invalid ServiceRequest for ServiceRequest with id '${id}'`);
      return;
    }
    // If this questionnaire has already been filled out,
    // Redirect to the
    if (serviceRequest?.supportingInfo?.[1]) {
      navigate(`/ServiceRequest/${serviceRequest.id as string}`);
    }
    medplum
      .searchOne('Questionnaire', `context=${resolveId(serviceRequest.performer[0] as Reference<Practitioner>) ?? ''}`)
      .then((questionnaire) => {
        if (!questionnaire) {
          console.debug(`No questionnaire for given performer: ${serviceRequest.performer}`);
          // If no questionnaire to fill out,
          // Then redirect to ServiceRequest page for this referral
          navigate(`/ServiceRequest/${serviceRequest.id as string}`);
          return;
        }
        setCurrentQuestionnaire(createReference<Questionnaire>(questionnaire));
      })
      .catch(console.error);
  }, [medplum, navigate, id, serviceRequest]);

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
              value: createReference(completedResponse),
            },
          ]);
          navigate(`/ServiceRequest/${serviceRequest.id as string}`);
          return;
        })
        .catch(console.error);
    },
    [medplum, navigate, currentQuestionnaire?.reference, serviceRequest]
  );

  return (
    <Container fluid>
      {currentQuestionnaire ? (
        <QuestionnaireForm questionnaire={currentQuestionnaire} onSubmit={handleSubmit} />
      ) : (
        <Loading />
      )}
    </Container>
  );
}
