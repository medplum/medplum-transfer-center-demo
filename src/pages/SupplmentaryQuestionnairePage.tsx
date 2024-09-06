import { Container } from '@mantine/core';
import { createReference, resolveId } from '@medplum/core';

import { Questionnaire, QuestionnaireResponse, Reference, ServiceRequest } from '@medplum/fhirtypes';
import { Loading, QuestionnaireForm, useMedplum, useMedplumNavigate, useResource } from '@medplum/react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export function SupplemenaryQuestionnairePage(): JSX.Element {
  const medplum = useMedplum();
  const { id } = useParams();

  const serviceRequest = useResource<ServiceRequest>({ reference: `ServiceRequest/${id}` });

  const navigate = useMedplumNavigate();
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Reference<Questionnaire>>();

  useEffect(() => {
    medplum
      .searchOne('Questionnaire', `context=${resolveId(serviceRequest?.performer?.[0]) ?? ''}`)
      .then((questionnaire) => {
        setCurrentQuestionnaire(questionnaire ? createReference<Questionnaire>(questionnaire) : undefined);
      })
      .catch(console.error);
  }, [serviceRequest, medplum]);

  const handleSubmit = useCallback(
    (response: QuestionnaireResponse) => {
      if (!serviceRequest) {
        return;
      }
      medplum
        .createResource(response)
        .then(() => {
          // Add reference to this questionnaire response to ServiceRequest
          medplum
            .patchResource('ServiceRequest', resolveId(serviceRequest) as string, [
              {
                op: 'replace',
                path: '/supportingInfo',
                value: [...(serviceRequest.supportingInfo ?? []), createReference(response)],
              },
            ])
            .then(() => {
              navigate('/transfers');
            })
            .catch(console.error);
        })
        .catch(console.error);
    },
    [serviceRequest, medplum, navigate]
  );

  if (!currentQuestionnaire) {
    return <Loading />;
  }

  return (
    <Container fluid>
      <QuestionnaireForm questionnaire={currentQuestionnaire} onSubmit={handleSubmit} />
    </Container>
  );
}
