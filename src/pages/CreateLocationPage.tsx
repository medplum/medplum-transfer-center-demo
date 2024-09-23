import { Container } from '@mantine/core';
import { Questionnaire, QuestionnaireResponse } from '@medplum/fhirtypes';
import { QuestionnaireForm, useMedplum, useMedplumNavigate } from '@medplum/react';
import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';

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

  const questionnaire = useMemo(() => (id ? createLocationRoomQuestionnaire : createLocationLvlQuestionnaire), [id]);

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

const createLocationLvlQuestionnaire: Questionnaire = {
  resourceType: 'Questionnaire',
  status: 'active',
  name: 'create-location-lvl-questionnaire',
  title: 'Create Location Form',
  item: [
    {
      linkId: 'name',
      type: 'string',
      text: 'Name',
      required: true,
    },
    {
      linkId: 'status',
      type: 'choice',
      text: 'Status',
      answerValueSet: 'http://hl7.org/fhir/ValueSet/location-status',
      required: true,
    },
    {
      linkId: 'telecomPhone',
      type: 'string',
      text: 'Phone',
    },
  ],
};

const createLocationRoomQuestionnaire: Questionnaire = {
  resourceType: 'Questionnaire',
  status: 'active',
  name: 'create-location-ro-questionnaire',
  title: 'Create Room Form',
  item: [
    {
      linkId: 'name',
      type: 'string',
      text: 'Name',
      required: true,
    },
    {
      linkId: 'status',
      type: 'choice',
      text: 'Status',
      answerValueSet: 'http://hl7.org/fhir/ValueSet/location-status',
      required: true,
    },
    {
      linkId: 'operationalStatus',
      type: 'choice',
      text: 'Operational Status',
      answerValueSet: 'http://terminology.hl7.org/ValueSet/v2-0116',
      required: true,
    },
  ],
};
