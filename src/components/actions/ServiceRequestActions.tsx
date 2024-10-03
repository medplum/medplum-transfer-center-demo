import { Button, Stack, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { AssignToRoomModal } from '@/components/actions/AssignToRoomModal';
import { AddServiceRequestNoteModal } from '@/components/actions/AddServiceRequestNoteModal';
import { ServiceRequest } from '@medplum/fhirtypes';
import { useNavigate } from 'react-router-dom';
import { useSupplementaryQuestionnaire } from '@/hooks/useSupplementaryQuestionnaire';

interface ServiceRequestActionsProps {
  serviceRequest: ServiceRequest;
  onChange: (updatedServiceRequest: ServiceRequest) => void;
}

export function ServiceRequestActions(props: ServiceRequestActionsProps): JSX.Element {
  const { serviceRequest, onChange } = props;
  const [openAssignToRoomModal, setOpenAssignToRoomModal] = useState(false);
  const navigate = useNavigate();

  const [showAcceptingPhysicianButton, setShowAcceptingPhysicianButton] = useState<boolean | undefined>(undefined);
  const [showPractitionerButton, setShowPractitionerButton] = useState<boolean | undefined>(undefined);

  const acceptingPhysicianQuestionnaire = useSupplementaryQuestionnaire(serviceRequest, 'acceptingPhysician');
  const practitionerQuestionnaire = useSupplementaryQuestionnaire(serviceRequest, 'practitioner');

  useEffect(() => {
    async function loadIsAcceptingResponse() {
      const isAcceptingPhysicianResponse = await acceptingPhysicianQuestionnaire.isAcceptingResponse();
      const isPractitionerResponse = await practitionerQuestionnaire.isAcceptingResponse();

      setShowAcceptingPhysicianButton(isAcceptingPhysicianResponse);
      setShowPractitionerButton(isPractitionerResponse);
    }

    loadIsAcceptingResponse();
  }, [acceptingPhysicianQuestionnaire, practitionerQuestionnaire]);

  return (
    <Stack p="xs" m="xs">
      <Title>Actions</Title>
      <Stack>
        {showAcceptingPhysicianButton ? (
          <Button onClick={() => navigate(`/ServiceRequest/${serviceRequest.id}/accepting-physician-supplement`)}>
            Submit Accepting Physician
          </Button>
        ) : null}
        {showPractitionerButton ? (
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
