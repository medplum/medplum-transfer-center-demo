import { BedStatsWidget } from '@/components/BedStatsWidget/BedStatsWidget';
import { FhirPathTable, FhirPathTableField } from '@/components/FhirPathTable/FhirPathTable';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { PAPER_PROPS } from '@/lib/common';
import { Button, Container, Paper, Stack, Table, TableTd, TableTh, Text, Title } from '@mantine/core';
import { PropertyType, formatDate } from '@medplum/core';
import { Bundle } from '@medplum/fhirtypes';
import { Loading, useMedplum } from '@medplum/react';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

const HAYS_CALL_RESULT_SYSTEM_STR = 'https://haysmed.com/fhir/CodeSystem/call-dispositions';

const serviceReqQuery = `{
  ResourceList: ServiceRequestList(code: "http://snomed.info/sct|19712007", authored: "gt01-01-70", _sort: "-authored", _count: 4) {
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

const RESULT_CODES = ['COMPLETE', 'DECLINED', 'HLOC', 'CANCELLED', 'CONSULT'] as const;
type ResultCode = (typeof RESULT_CODES)[number];

type ResultCodeCountDisplayProps = {
  code: ResultCode;
};

function ResultCodeCountDisplay(props: ResultCodeCountDisplayProps): JSX.Element {
  const medplum = useMedplum();
  const [count, setCount] = useState<number>();

  useEffect(() => {
    medplum
      .search(
        'ServiceRequest',
        `_has:CommunicationRequest:based-on:_has:Communication:based-on:_tag=${HAYS_CALL_RESULT_SYSTEM_STR}|${props.code}&_summary=count`
      )
      .then((bundle: Bundle) => {
        setCount(bundle.total);
      })
      .catch(console.error);
  }, [medplum, props.code]);

  if (count === undefined) {
    return <Loading />;
  }

  return <p>{count}</p>;
}

function getCodeDisplayString(code: ResultCode): string {
  switch (code) {
    case 'COMPLETE':
      return 'Completed';
    case 'CONSULT':
      return 'Consultation';
    case 'HLOC':
      return 'Higher Level of Care';
    case 'CANCELLED':
      return 'Cancellation';
    case 'DECLINED':
      return 'Declination';
    default:
      return 'Invalid code';
  }
}

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();

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
        render: ({ value }) => <StatusBadge status={value ?? 'In Progress'} />,
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
      <Stack gap="lg" mt={15}>
        <BedStatsWidget />
        <Paper {...PAPER_PROPS}>
          <FhirPathTable resourceType="ServiceRequest" query={serviceReqQuery} fields={fields} />
        </Paper>
        <Paper {...PAPER_PROPS}>
          <Stack>
            <Title>Transfer Resolutions - MTD (September 2024)</Title>
            <Table>
              <Table.Tbody>
                <Table.Tr>
                  {RESULT_CODES.map((code) => {
                    return <TableTh key={code}>{getCodeDisplayString(code)}</TableTh>;
                  })}
                </Table.Tr>
                <Table.Tr>
                  {RESULT_CODES.map((code) => {
                    return (
                      <TableTd key={code}>
                        <ResultCodeCountDisplay code={code} />
                      </TableTd>
                    );
                  })}
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Stack>
        </Paper>
      </Stack>
      <Outlet />
    </Container>
  );
}
