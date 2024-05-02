import { Modal, Text } from '@mantine/core';
import { getReferenceString } from '@medplum/core';
import { Resource } from '@medplum/fhirtypes';
import { ResourceForm, useMedplum } from '@medplum/react';
import { useNavigate } from 'react-router-dom';

interface CreateLocationModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
}

export function CreateLocationModal(props: CreateLocationModalProps): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  //   const location = useLocation();
  //   const resourceType = location.pathname.split('/')[1];
  const resourceType = 'Location';

  const defaultResource = { resourceType } as Resource;

  const handleSubmit = (newResource: Resource): void => {
    console.log('Create location', newResource);
    medplum
      .createResource(newResource)
      .then((result) => navigate(`/${getReferenceString(result)}`))
      .catch((error) => console.error(error));
  };

  return (
    <Modal size="xl" opened={props.opened} onClose={props.onClose}>
      <Text>Create Location</Text>
      <ResourceForm defaultValue={defaultResource} onSubmit={handleSubmit}></ResourceForm>
    </Modal>
  );
}
