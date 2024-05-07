import { DataTable } from 'mantine-datatable';
import { Badge, MantineColor } from '@mantine/core';
import { ReactNode } from 'react';
import ErrorAlert from '@/components/ErrorAlert';

type Status = 'In Progress' | 'Declination' | 'Completed' | 'Pending' | 'Consultation' | string;

const StatusBadge = ({ status }: { status: Status }) => {
  let color: MantineColor = '';

  switch (status) {
    case 'In Progress':
      color = 'blue';
      break;
    case 'Declination':
      color = 'red';
      break;
    case 'Completed':
      color = 'green';
      break;
    case 'Higher Level Care':
      color = 'orange';
      break;
    case 'Consultation':
      color = 'yellow';
      break;
    default:
      color = 'gray';
  }

  return (
    <Badge color={color} variant="filled" radius="sm">
      {status}
    </Badge>
  );
};

type ProjectItem = {
  id: string;
  name: string;
  date: string;
  transfer_from: string;
  state: Status;
  transfer_doctor: string;
};

type ProjectsTableProps = {
  data?: ProjectItem[];
  error: ReactNode;
  loading: boolean;
};

const ProjectsTable = ({ data, error, loading }: ProjectsTableProps) => {
  return error ? (
    <ErrorAlert title="Error loading projects" message={error.toString()} />
  ) : (
    <DataTable
      verticalSpacing="sm"
      highlightOnHover
      columns={[
        { accessor: 'name' },
        { accessor: 'date' },
        { accessor: 'transfer_from' },
        { accessor: 'transfer_doctor' },
        {
          accessor: 'state',
          render: ({ state }) => <StatusBadge status={state} />,
        },
      ]}
      records={data}
      fetching={loading}
      // TODO: fix empty state
      emptyState={<div></div>}
    />
  );
};

export default ProjectsTable;
