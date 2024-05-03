import { Stack, Container, PaperProps } from '@mantine/core';

import BedStatsGrid from '@/components/BedStatsGrid';
import useFetchData from '@/hooks/useFetchData';

const PAPER_PROPS: PaperProps = {
  p: 'md',
  shadow: 'md',
  radius: 'md',
  style: { height: '100%' },
};

export function TransferPage(): JSX.Element {
  //TODO: replace with actual data fetching to Medplum
  const { data: statsData, error: statsError, loading: statsLoading } = useFetchData('/data/BedGridData.json');

  return (
    <Container fluid>
      <Stack gap="lg">
        <h3>Transfer Page</h3>
        <BedStatsGrid data={statsData} error={statsError} loading={statsLoading} paperProps={PAPER_PROPS} />
      </Stack>
    </Container>
  );
}
