import { Container } from '@mantine/core';

import { QuestionnaireResponse } from '@medplum/fhirtypes';
import { QuestionnaireForm, useMedplum, useMedplumNavigate } from '@medplum/react';
import { useCallback } from 'react';

export function NewPhysicianPage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useMedplumNavigate();

  const handleSubmit = useCallback(
    (response: QuestionnaireResponse) => {
      medplum
        .createResource(response)
        .then(() => {
          navigate('/physicians');
        })
        .catch(console.error);
    },
    [medplum, navigate]
  );

  return (
    <Container fluid>
      <QuestionnaireForm
        questionnaire={{ reference: 'Questionnaire/d617f4a4-2d38-478f-99dc-d27167f7d03d' }}
        onSubmit={handleSubmit}
      />
    </Container>
  );
}
