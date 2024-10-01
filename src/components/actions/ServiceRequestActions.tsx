import { Button, Stack, Title } from '@mantine/core';
import { useState } from 'react';
import { AssignToRoomModal } from '@/components/actions/AssignToRoomModal';
import { AddServiceRequestNoteModal } from '@/components/actions/AddServiceRequestNoteModal';
import { ServiceRequest } from '@medplum/fhirtypes';
import { useNavigate } from 'react-router-dom';

interface ServiceRequestActionsProps {
  serviceRequest: ServiceRequest;
  onChange: (updatedServiceRequest: ServiceRequest) => void;
}

export function ServiceRequestActions(props: ServiceRequestActionsProps): JSX.Element {
  const { serviceRequest, onChange } = props;
  const [openAssignToRoomModal, setOpenAssignToRoomModal] = useState(false);
  const navigate = useNavigate();

  return (
    <Stack p="xs" m="xs">
      <Title>Actions</Title>
      <Stack>
        {/* FIXME: Add checks before displaying the supplementary buttons */}
        <Button onClick={() => navigate(`/ServiceRequest/${serviceRequest.id}/accepting-physician-supplement`)}>
          Submit Accepting Physician
        </Button>
        <Button onClick={() => navigate(`/new-patient/ServiceRequest/${serviceRequest.id}`)}>
          Submit Physician Form
        </Button>{' '}
        <Button onClick={() => setOpenAssignToRoomModal(true)}>Set Call Disposition</Button>
        <AssignToRoomModal opened={openAssignToRoomModal} onClose={() => setOpenAssignToRoomModal(false)} />
        <AddServiceRequestNoteModal serviceRequest={serviceRequest} onChange={onChange} />
      </Stack>
    </Stack>
  );
}
