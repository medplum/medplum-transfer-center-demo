import { Badge, Group, Paper, PaperProps, Text } from '@mantine/core';
import classes from '@/components/BedStatsCard/BedStatsCard.module.css';
import Surface from '@/components/Surface';
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

type BedStatsCardProps = {
  data: { title: string; value: string; diff: number; period?: string; icon: keyof typeof icons; ext?: string };
} & PaperProps;

const icons = {
  user: IconUserPlus,
  discount: IconDiscount2,
  receipt: IconReceipt2,
  coin: IconCoin,
  bed: IconBedFilled,
  bedOff: IconBedOff,
};

const BedStatsCard = ({ data, ...others }: BedStatsCardProps) => {
  const { title, value, period, diff, icon, ext } = data;
  const DiffIcon = diff > 0 ? IconArrowUpRight : IconArrowDownRight;
  const Icon = icons[icon];

  return (
    <Surface component={Paper} {...others}>
      <Group justify="space-between">
        <Text size="xs" c="dimmed" className={classes.title}>
          {title}
        </Text>
        {period && (
          <Badge variant="filled" radius="sm">
            {period}
          </Badge>
        )}
        <Icon className={classes.icon} size="1.4rem" stroke={1.5} />
      </Group>

      <Group align="flex-end" gap="xs" mt={25}>
        <Text className={classes.value}>{value}</Text>
        <Text c={diff > 0 ? 'teal' : 'red'} fz="sm" fw={500} className={classes.diff}>
          <span>{diff}%</span>
          <DiffIcon size="1rem" stroke={1.5} />
        </Text>
      </Group>

      <Text fz="xs" c="dimmed" mt={7}>
        Charge Nurse Betty (ext: {ext})
      </Text>
    </Surface>
  );
};

export default BedStatsCard;
