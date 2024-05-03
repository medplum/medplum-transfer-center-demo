import { ReactNode } from 'react';
import { SimpleGrid, Skeleton, PaperProps } from '@mantine/core';
import BedStatsCard from '@/components/BedStatsCard';
import ErrorAlert from '@/components/ErrorAlert';

type StatsGridProps = {
  data?: { title: string; value: string; diff: number; period?: string; ext?: string; icon?: string }[];
  error?: ReactNode;
  paperProps?: PaperProps;
  loading?: boolean;
};

export default function StatsGrid({ data, paperProps, error, loading }: StatsGridProps) {
  const stats = data?.map((stat) => <BedStatsCard key={stat.title} data={stat} {...paperProps} />);

  return (
    <>
      {/* <div className={classes.root}> */}
      {error ? (
        <ErrorAlert title="Error loading stats" message={error.toString()} />
      ) : (
        <SimpleGrid
          cols={{ base: 1, sm: 2, lg: 4 }}
          spacing={{ base: 10, sm: 'xl' }}
          verticalSpacing={{ base: 'md', sm: 'xl' }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={`stats-loading-${i}`} visible={true} height={200} />
              ))
            : stats}
        </SimpleGrid>
      )}
      {/* </div> */}
    </>
  );
}
