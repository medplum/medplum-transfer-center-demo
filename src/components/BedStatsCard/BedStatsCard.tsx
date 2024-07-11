import { useState } from 'react';
import { Badge, Group, Paper, PaperProps, Text, Modal, Button, Table } from '@mantine/core';
import classes from '@/components/BedStatsCard/BedStatsCard.module.css';
import Surface from '@/components/Surface';
import { Location } from '@medplum/fhirtypes';
import {
  IconUserPlus,
  IconDiscount2,
  IconReceipt2,
  IconCoin,
  IconArrowUpRight,
  IconArrowDownRight,
  IconBedFilled,
  IconBedOff,
} from '@tabler/icons-react';

interface ExtendedLocation extends Location {
  numBeds: number;
  numTotalBeds: number;
  phone: string;
}

type BedStatsCardProps = {
  data: ExtendedLocation;
  // data: { id: number; name: string; phone: string; numBeds: number; numTotalBeds: number };
  locationDetails: { [key: string]: Location[] };
} & PaperProps;

const icons = {
  user: IconUserPlus,
  discount: IconDiscount2,
  receipt: IconReceipt2,
  coin: IconCoin,
  bed: IconBedFilled,
  bedOff: IconBedOff,
};

const BedStatsCard = ({ data, locationDetails, ...others }: BedStatsCardProps) => {
  const [opened, setOpened] = useState(false);
  const { id, name, phone, numBeds, numTotalBeds } = data;

  // TODO:  Fix hard coded value for diff, ext, and icon
  const diff = Math.round((numBeds / numTotalBeds) * 100);
  const icon = 'bed';
  const DiffIcon = diff > 0 ? IconArrowUpRight : IconArrowDownRight;
  const Icon = icons[icon];
  // const random = 'xzy';

  const sortedDetails = locationDetails[id]?.slice().sort((a, b) => a.name.localeCompare(b.name));

  //TODO: Fix value is the number of beds, need to look this up in medplum for each location
  // const value = '10';

  return (
    <>
      <Surface component={Paper} {...others}>
        <Group justify="space-between">
          {/* <Text size="xs" c="dimmed" className={classes.title}>
          {name}
        </Text> */}
          {name && (
            <Badge variant="filled" radius="sm">
              {name}
            </Badge>
          )}
          {/* {random && (
          <Badge variant="filled" radius="sm" color="red">
            {random}
          </Badge>
        )} */}
          {/* <Icon className={classes.icon} size="1.4rem" stroke={1.5} /> */}
          <Icon className={classes.icon} size="1.4rem" stroke={1.5} onClick={() => setOpened(true)} />
        </Group>

        <Group align="flex-end" gap="xs" mt={15}>
          <Text className={classes.value}>
            {numBeds} of {numTotalBeds}
          </Text>
          <Text c={diff > 0 ? 'teal' : 'red'} fz="sm" fw={500} className={classes.diff}>
            <span>{diff}%</span>
            <DiffIcon size="1rem" stroke={1.5} />
          </Text>
        </Group>

        <Group align="flex-end" gap="xs" mt={5} color="red">
          <Text fz="xs" c="dimmed" mt={7}>
            ext: {phone}
          </Text>
          <Text fz="xs" c="dimmed" mt={2}>
            {id}
          </Text>
        </Group>
      </Surface>
      <Modal opened={opened} onClose={() => setOpened(false)} title={name}>
        <div>
          {sortedDetails ? (
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {sortedDetails.map((detail, index) => (
                  <tr key={index}>
                    <td>{detail.name}</td>
                    <td>{detail.description}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p>No details available.</p>
          )}
          <Button onClick={() => setOpened(false)}>OK</Button>
        </div>
      </Modal>
    </>
  );
};

export default BedStatsCard;
