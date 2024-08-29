import { Modal } from '@mantine/core';
import { QuestionnaireResponse } from '@medplum/fhirtypes';
import { QuestionnaireForm, useMedplum } from '@medplum/react';
import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface AssignToRoomModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
}

export function AssignToRoomModal(props: AssignToRoomModalProps): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const navigate = useNavigate();

  // const defaultResource = { resourceType } as Resource;
  const handleSubmit = useCallback(
    (response: QuestionnaireResponse) => {
      medplum
        .createResource(response)
        .then(() => navigate('/dashboard'))
        .catch(console.error);
    },
    [medplum, navigate]
  );

  return (
    <Modal size="lg" opened={props.opened} onClose={props.onClose}>
      <QuestionnaireForm
        questionnaire={{ reference: 'Questionnaire/989e50a6-55a4-4e96-90f4-f9a231b29769' }}
        subject={{ reference: `ServiceRequest/${id}` }}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}
