import { Button, Container } from '@mantine/core';

import { getReferenceString } from '@medplum/core';
import { SearchControl, useMedplumNavigate, useSubscription } from '@medplum/react';

const useSubOpts = {
  subscriptionProps: {
    extension: [
      {
        url: 'https://medplum.com/fhir/StructureDefinition/subscription-supported-interaction',
        valueCode: 'create',
      },
    ],
  },
};

export function TransferPage(): JSX.Element {
  const navigate = useMedplumNavigate();

  // This subscription listens for new patient creates
  // TODO: Make this more selective
  useSubscription('Patient', () => {}, useSubOpts);

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
