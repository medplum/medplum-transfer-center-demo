import { Container } from '@mantine/core';

import { QuestionnaireResponse } from '@medplum/fhirtypes';
import { QuestionnaireForm, useMedplum, useMedplumNavigate } from '@medplum/react';
import { useCallback } from 'react';

export function NewPatientPage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useMedplumNavigate();

  const handleSubmit = useCallback(
    (response: QuestionnaireResponse) => {
      medplum
        .createResource(response)
        .then(() => navigate('/transfers'))
        .catch(console.error);
    },
    [medplum, navigate]
  );

  return (
    <Container fluid>
      <QuestionnaireForm
        questionnaire={{ reference: 'Questionnaire/4469a0a6-10e3-4712-b735-a32b121d45e1' }}
        onSubmit={handleSubmit}
      />
    </Container>
  );
}
