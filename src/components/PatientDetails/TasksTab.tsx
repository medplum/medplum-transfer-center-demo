import { PropertyType } from '@medplum/core';
import { ServiceRequest } from '@medplum/fhirtypes';
import { FhirPathTable, FhirPathTableField } from '@/components/FhirPathTable/FhirPathTable';

interface TasksTabProps {
  serviceRequest: ServiceRequest;
}

export function TasksTab(props: TasksTabProps): JSX.Element {
  const { serviceRequest } = props;

  const query = `{
    ResourceList: TaskList(based_on: "ServiceRequest/${serviceRequest.id}") {
      id
      status
      owner {
        display
      }
    }
  }`;

  const fields: FhirPathTableField[] = [
    {
      name: 'Status',
      fhirPath: 'status',
      propertyType: PropertyType.code,
    },
    {
      name: 'Primary Accepting Physician',
      fhirPath: 'owner.display',
      propertyType: PropertyType.string,
    },
  ];

  return <FhirPathTable searchType="graphql" resourceType="Task" query={query} fields={fields} />;
}
