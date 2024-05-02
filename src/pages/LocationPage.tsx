import { Outlet } from 'react-router-dom';

import { Title } from '@mantine/core';
import { Document, SearchControl, useMedplumNavigate } from '@medplum/react';
import { getReferenceString } from '@medplum/core';
import { CreateLocationModal } from '../components/actions/CreateLocationModal';
import { useState } from 'react';

export function LocationsPage(): JSX.Element {
  const [isNewOpen, setIsNewOpen] = useState<boolean>(false);
  const navigate = useMedplumNavigate();

  return (
    <Document fill={true}>
      <Title>Locations</Title>

      <SearchControl
        search={{ resourceType: 'Location', fields: ['name', 'address'] }}
        onClick={(e) => navigate(`${getReferenceString(e.resource)}`)}
        onNew={() => setIsNewOpen(true)}
        hideToolbar={false}
      />
      <Outlet />
      <CreateLocationModal opened={isNewOpen} onClose={() => setIsNewOpen(!isNewOpen)} />
    </Document>
  );
}
