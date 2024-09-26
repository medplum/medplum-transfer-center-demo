import { Button, Stack, Title } from '@mantine/core';
import { useState } from 'react';
import { AssignToRoomModal } from '@/components/actions/AssignToRoomModal';

export function ServiceRequestActions(): JSX.Element {
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <Stack p="xs" m="xs">
        <Title>Actions</Title>
        <Button onClick={() => setOpenModal(true)}>Set Call Disposition</Button>
      </Stack>

      <AssignToRoomModal opened={openModal} onClose={() => setOpenModal(false)} />
    </>
  );
}
