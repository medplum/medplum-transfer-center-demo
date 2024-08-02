import { Button, Container } from '@mantine/core';

import { getReferenceString } from '@medplum/core';
import { SearchControl, useMedplumNavigate } from '@medplum/react';

export function TransferPage(): JSX.Element {
  const navigate = useMedplumNavigate();

  return (
    <Container fluid>
      <Button my={15} onClick={() => navigate('/new-patient')}>
        New
      </Button>
      <SearchControl
        search={{ resourceType: 'Patient', fields: ['name', 'birthdate'], sortRules: [{ code: '-_lastUpdated' }] }}
        onClick={(e) => navigate(`/${getReferenceString(e.resource)}`)}
      />
    </Container>
  );
}
