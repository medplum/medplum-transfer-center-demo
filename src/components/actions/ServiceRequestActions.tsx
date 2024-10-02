import { Button, Stack, Title } from '@mantine/core';
import { useState } from 'react';
import { AssignToRoomModal } from '@/components/actions/AssignToRoomModal';
import { AddServiceRequestNoteModal } from '@/components/actions/AddServiceRequestNoteModal';
import { ServiceRequest } from '@medplum/fhirtypes';
import { useNavigate } from 'react-router-dom';
import { getSupplementaryQuestionnaireContext } from '@/utils/getSupplementaryQuestionnaireContext';

interface ServiceRequestActionsProps {
  serviceRequest: ServiceRequest;
  onChange: (updatedServiceRequest: ServiceRequest) => void;
}

export function ServiceRequestActions(props: ServiceRequestActionsProps): JSX.Element {
  const { serviceRequest, onChange } = props;
  const [openAssignToRoomModal, setOpenAssignToRoomModal] = useState(false);
  const navigate = useNavigate();

  const { isResponseAvailable: isAcceptingPhysicianResponseAvailable } = getSupplementaryQuestionnaireContext(
    serviceRequest,
    '/accepting-physician-supplement'
  );
  const { isResponseAvailable: isPractitionerResponseAvailable } = getSupplementaryQuestionnaireContext(
    serviceRequest,
    '/practitioner-supplement'
  );

  return (
    <Stack p="xs" m="xs">
      <Title>Actions</Title>
      <Stack>
        {!isAcceptingPhysicianResponseAvailable ? (
          <Button onClick={() => navigate(`/ServiceRequest/${serviceRequest.id}/accepting-physician-supplement`)}>
            Submit Accepting Physician
          </Button>
        ) : null}
        {/* FIXME: Check if the practitioner has a questionnaire  */}
        {!isPractitionerResponseAvailable ? (
          <Button onClick={() => navigate(`/ServiceRequest/${serviceRequest.id}/practitioner-supplement`)}>
            Submit Physician Form
          </Button>
        ) : null}
        <Button onClick={() => setOpenAssignToRoomModal(true)}>Set Call Disposition</Button>
        <AssignToRoomModal opened={openAssignToRoomModal} onClose={() => setOpenAssignToRoomModal(false)} />
        <AddServiceRequestNoteModal serviceRequest={serviceRequest} onChange={onChange} />
      </Stack>
    </Stack>
  );
}
