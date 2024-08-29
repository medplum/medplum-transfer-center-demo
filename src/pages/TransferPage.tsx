import { FhirPathTableField } from '@/components/FhirPathTable/FhirPathTable';
import { Button, Container } from '@mantine/core';
import { PropertyType } from '@medplum/core';
import { FhirPathTable, useMedplumNavigate } from '@medplum/react';

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

const fields: FhirPathTableField[] = [
  {
    name: 'Patient Name',
    fhirPath: 'subject.display',
    propertyType: PropertyType.string,
  },
  {
    name: 'Transferring Facility',
    fhirPath: 'requester.resource.PractitionerRoleList[0].organization.display',
    propertyType: PropertyType.string,
  },
  {
    name: 'Transferring Physician',
    fhirPath: 'requester.display',
    propertyType: PropertyType.string,
  },
];

export function TransferPage(): JSX.Element {
  const navigate = useMedplumNavigate();
  return (
    <Container fluid>
      <Button my={15} onClick={() => navigate('/new-patient')}>
        New
      </Button>
      <FhirPathTable resourceType="ServiceRequest" query={serviceReqQuery} fields={fields} />
    </Container>
  );
}
