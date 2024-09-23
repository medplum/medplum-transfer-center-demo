import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Container, Title } from '@mantine/core';
import { PropertyType } from '@medplum/core';
import { FhirPathTable, FhirPathTableField } from '@/components/FhirPathTable/FhirPathTable';
import { useMedplum } from '@medplum/react';

const parentOrgId = 'ba836894-122f-42d0-874b-83ea9557e4f3';

export function LocationsPage(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams();

  const medplum = useMedplum();

  const location = id ? medplum.readResource('Location', id).read() : undefined;

  const pageTitle = id && location ? `${location.name}'s Rooms` : 'Locations';

  const fields = useMemo<FhirPathTableField[]>(() => {
    if (id) {
      return [
        {
          name: 'Name',
          fhirPath: 'name',
          propertyType: PropertyType.string,
        },
        {
          name: 'Description',
          fhirPath: 'description',
          propertyType: PropertyType.string,
        },
        {
          name: 'Status',
          fhirPath: 'status',
          propertyType: PropertyType.string,
        },
        {
          name: 'Operational Status',
          fhirPath: 'operationalStatus',
          propertyType: PropertyType.Coding,
        },
      ];
    }
    return [
      {
        name: 'Name',
        fhirPath: 'name',
        propertyType: PropertyType.string,
      },
      {
        name: 'Status',
        fhirPath: 'status',
        propertyType: PropertyType.string,
      },
      {
        name: 'Telecom',
        fhirPath: 'telecom[0]',
        propertyType: PropertyType.ContactPoint,
      },
      {
        name: '',
        fhirPath: 'id',
        propertyType: PropertyType.id,
        render: ({ value }) => <Button onClick={() => navigate(`/Location/${value}/rooms`)}>View Rooms</Button>,
      },
    ];
  }, [id, navigate]);

  const query = useMemo(() => {
    if (id) {
      return `{
        ResourceList: LocationList(partof: "Location/${id}", physical_type: "ro", _sort: "name", _count: 40) {
          id
          name
          description
          status
          operationalStatus {
            code
            display
          }
        }
      }`;
    }
    return `{
      ResourceList: LocationList(partof: "Location/${parentOrgId}", physical_type: "lvl", _sort: "name", _count: 40) {
        id
        name
        status
        telecom(system: "phone") {
          system,
          value
        }
      }
    }`;
  }, [id]);

  function handleNewClick() {
    navigate(id ? `/Location/${id}/new` : '/Location/new');
  }

  return (
    <Container fluid>
      <Title>{pageTitle}</Title>
      <Button my={15} onClick={handleNewClick}>
        New
      </Button>
      <FhirPathTable searchType="graphql" resourceType="Location" query={query} fields={fields} />
    </Container>
  );
}
