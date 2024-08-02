import { PatientTable } from '@/components/PatientTable/PatientTable';
import { Button, Container } from '@mantine/core';
import { parseSearchRequest } from '@medplum/core';
import { useMedplumNavigate } from '@medplum/react';

export function TransferPage(): JSX.Element {
  const navigate = useMedplumNavigate();
  return (
    <Container fluid>
      <Button my={15} onClick={() => navigate('/new-patient')}>
        New
      </Button>
      <PatientTable
        search={{
          ...parseSearchRequest('Patient?_revinclude=Encounter:subject'),
          fields: ['name', 'birthdate', 'location', '_lastUpdated'],
          sortRules: [{ code: '-_lastUpdated' }],
        }}
      />
    </Container>
  );
}
