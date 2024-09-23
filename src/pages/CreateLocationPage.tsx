import { Container } from '@mantine/core';
import { Questionnaire, QuestionnaireResponse, Reference } from '@medplum/fhirtypes';
import { QuestionnaireForm, useMedplum, useMedplumNavigate } from '@medplum/react';
import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';

const CREATE_LOCATION_LVL_QUESTIONNAIRE_ID = 'cd78cab0-d3b4-4b33-9df2-60289ac3ca8b';
const CREATE_LOCATION_ROOM_QUESTIONNAIRE_ID = 'e82a8b16-27fa-4f34-a8cd-daacaac6fc81';

export function CreateLocationPage(): JSX.Element {
  const navigate = useMedplumNavigate();
  const { id } = useParams();

  const medplum = useMedplum();

  const handleSubmit = useCallback(
    (response: QuestionnaireResponse) => {
      medplum
        .createResource(response)
        .then(() => {
          navigate(id ? `/Location/${id}/rooms` : '/Location');
        })
        .catch(console.error);
    },
    [id, medplum, navigate]
  );

  const questionnaire: Reference<Questionnaire> = useMemo(
    () => ({
      reference: id
        ? `Questionnaire/${CREATE_LOCATION_ROOM_QUESTIONNAIRE_ID}`
        : `Questionnaire/${CREATE_LOCATION_LVL_QUESTIONNAIRE_ID}`,
    }),
    [id]
  );

  return (
    <Container fluid>
      <QuestionnaireForm
        subject={id ? { reference: `Location/${id}` } : undefined}
        questionnaire={questionnaire}
        onSubmit={handleSubmit}
      />
    </Container>
  );
}
