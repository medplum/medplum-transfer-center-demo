import { Modal } from '@mantine/core';
import { QuestionnaireResponse } from '@medplum/fhirtypes';
import { QuestionnaireForm, useMedplum } from '@medplum/react';
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

interface AssignToRoomModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
}

export function AssignToRoomModal(props: AssignToRoomModalProps): JSX.Element {
  const { opened, onClose } = props;
  const { id } = useParams();
  const medplum = useMedplum();

  const handleSubmit = useCallback(
    (response: QuestionnaireResponse) => {
      medplum
        .createResource(response)
        .then(() => {
          onClose();
        })
        .catch(console.error);
    },
    [medplum, onClose]
  );

  return (
    <Modal size="lg" opened={opened} onClose={onClose}>
      <QuestionnaireForm
        questionnaire={{ reference: 'Questionnaire/989e50a6-55a4-4e96-90f4-f9a231b29769' }}
        subject={{ reference: `ServiceRequest/${id}` }}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}
