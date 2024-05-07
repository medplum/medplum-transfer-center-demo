import { Stack, Container, PaperProps, Title, Paper } from '@mantine/core';

import BedStatsGrid from '@/components/BedStatsGrid';
import TransferStatusTable from '@/components/TransferStatusTable';
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
  const {
    data: transferData,
    error: transferError,
    loading: transferLoading,
  } = useFetchData('/data/TransferData.json');

  return (
    <Container fluid>
      <Stack gap="lg">
        <Title>Transfer Center</Title>
        <BedStatsGrid data={statsData} error={statsError} loading={statsLoading} paperProps={PAPER_PROPS} />
        <Paper {...PAPER_PROPS}>
          <TransferStatusTable data={transferData.slice(0, 7)} error={transferError} loading={transferLoading} />
        </Paper>
      </Stack>
    </Container>
  );
}
