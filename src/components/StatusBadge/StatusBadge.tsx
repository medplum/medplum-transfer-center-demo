import { Badge, MantineColor } from '@mantine/core';

// type Status = 'In Progress' | 'Declination' | 'Completed' | 'Pending' | 'Consultation' | string | undefined;
type Status =
  | 'Completed Transfer'
  | 'Consultation'
  | 'Higher Level of Care'
  | 'Declination'
  | 'Cancellation'
  | undefined;

export const StatusBadge = ({ status }: { status: Status }) => {
  let color: MantineColor = '';

  switch (status) {
    // case 'In Progress':
    //   color = 'blue';
    //   break;
    case 'Completed Transfer':
      color = 'green';
      break;
    case 'Consultation':
      color = 'yellow';
      break;
    case 'Higher Level of Care':
      color = 'orange';
      break;
    case 'Declination':
      color = 'red';
      break;
    case 'Cancellation':
      color = 'red';
      break;
    default:
      color = 'gray';
  }

  return (
    <Badge color={color} variant="filled" radius="sm">
      {status ?? 'Unknown'}
    </Badge>
  );
};
