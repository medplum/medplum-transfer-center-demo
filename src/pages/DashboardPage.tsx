import { BedStatsWidget } from '@/components/BedStatsWidget/BedStatsWidget';
import { FhirPathTable, FhirPathTableField } from '@/components/FhirPathTable/FhirPathTable';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { PAPER_PROPS } from '@/lib/common';
import { ActionIcon, Button, Container, Paper, Stack, Text, Title } from '@mantine/core';
import { PropertyType, formatDate } from '@medplum/core';
import { IconRefresh } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

const serviceReqQuery = `{
  ResourceList: ServiceRequestList(code: "http://snomed.info/sct|19712007", authored: "gt01-01-70", _sort: "-authored") {
    id,
    authoredOn,
    subject {
      display,
      reference
    },
    requester {
      display,
      reference,
      resource {
        ... on Practitioner {
          PractitionerRoleList(_reference: practitioner) {
            organization {
              display,
              reference
            }
          }
        }
      }
    }
    CommunicationRequestList(_reference: based_on) {
      id,
      CommunicationList(_reference: based_on) {
        statusReason {
          text
        }
      }
    }
  }
}`;

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const [, setCount] = useState(0);

  const fields = useMemo<FhirPathTableField[]>(
    () => [
      {
        name: 'Patient',
        fhirPath: 'subject.display',
        propertyType: PropertyType.string,
      },
      {
        name: 'Date',
        fhirPath: 'authoredOn',
        propertyType: PropertyType.date,
        render: ({ value }) => (
          <Text>{formatDate(value, undefined, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}</Text>
        ),
      },
      {
        name: 'Transfer from',
        fhirPath: 'requester.resource.PractitionerRoleList[0].organization.display',
        propertyType: PropertyType.string,
      },
      {
        name: 'Transfer doctor',
        fhirPath: 'requester.display',
        propertyType: PropertyType.string,
      },
      {
        name: 'State',
        fhirPath: 'CommunicationRequestList[0].CommunicationList[0].statusReason.text',
        propertyType: PropertyType.string,
        render: ({ value }) => <StatusBadge status={value} />,
      },
      {
        name: '',
        fhirPath: 'id',
        propertyType: PropertyType.id,
        render: ({ value }) => <Button onClick={() => navigate(`ServiceRequest/${value as string}`)}>Edit</Button>,
      },
    ],
    [navigate]
  );

  return (
    <Container fluid>
      <Stack gap="lg">
        <Title>Transfer Center</Title>
        <BedStatsWidget />
        <Paper {...PAPER_PROPS}>
          <ActionIcon
            style={{ float: 'right' }}
            type="submit"
            size="1.5rem"
            color="blue"
            variant="outline"
            aria-label="Refresh"
          >
            <IconRefresh size="1rem" stroke={1.5} />
          </ActionIcon>
          <FhirPathTable resourceType="ServiceRequest" query={serviceReqQuery} fields={fields} />
        </Paper>
      </Stack>
      <Outlet />
    </Container>
  );
}
