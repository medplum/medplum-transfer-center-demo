import { Outlet } from 'react-router-dom';
import { Container, Title } from '@mantine/core';
import { SearchControl, useMedplumNavigate } from '@medplum/react';
import { getReferenceString } from '@medplum/core';
import { CreateLocationModal } from '../components/actions/CreateLocationModal';
import { useState } from 'react';

export function LocationsPage(): JSX.Element {
  const [isNewOpen, setIsNewOpen] = useState<boolean>(false);
  const navigate = useMedplumNavigate();

  return (
    <Container fluid>
      <Title>Locations</Title>

      <SearchControl
        search={{ resourceType: 'Location', fields: ['name', 'address'] }}
        onClick={(e) => navigate(`${getReferenceString(e.resource)}`)}
        onNew={() => setIsNewOpen(true)}
        hideToolbar={false}
      />
      <Outlet />
      <CreateLocationModal opened={isNewOpen} onClose={() => setIsNewOpen(!isNewOpen)} />
    </Container>
  );
}
