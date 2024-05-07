import { Container, Title } from '@mantine/core';

import { Practitioner } from '@medplum/fhirtypes';
import { ResourceName, SearchControl, useMedplumNavigate, useMedplumProfile } from '@medplum/react';
import { getReferenceString } from '@medplum/core';

export function MainPage(): JSX.Element {
  const profile = useMedplumProfile() as Practitioner;
  const navigate = useMedplumNavigate();

  return (
    <Container fluid>
      <Title>
        Welcome <ResourceName value={profile} link />
      </Title>
      <SearchControl
        search={{ resourceType: 'Patient', fields: ['name', 'birthdate', 'gender'] }}
        onClick={(e) => navigate(`/${getReferenceString(e.resource)}`)}
        hideToolbar
      />
      {/* <Outlet /> */}
    </Container>
  );
}
