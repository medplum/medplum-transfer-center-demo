import { Modal } from '@mantine/core';
import { QuestionnaireResponse } from '@medplum/fhirtypes';
import { QuestionnaireForm, useMedplum } from '@medplum/react';
import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface AssignQuestionnaireModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
}

export function AssignQuestionnaireModal(props: AssignQuestionnaireModalProps): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const navigate = useNavigate();

  // const defaultResource = { resourceType } as Resource;
  const handleSubmit = useCallback(
    (response: QuestionnaireResponse) => {
      medplum
        .createResource(response)
        .then(() => navigate('/physicians'))
        .catch(console.error);
    },
    [medplum, navigate]
  );

  return (
    <Modal size="lg" opened={props.opened} onClose={props.onClose}>
      <QuestionnaireForm
        questionnaire={{ reference: 'Questionnaire/92bad4dc-24ca-41f7-9fdb-80b5bfb57100' }}
        subject={{ reference: `Practitioner/${id}` }}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}
