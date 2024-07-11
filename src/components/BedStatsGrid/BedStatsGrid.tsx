// import { ReactNode } from 'react';
import { SimpleGrid, Skeleton, PaperProps } from '@mantine/core';
import BedStatsCard from '@/components/BedStatsCard';
import ErrorAlert from '@/components/ErrorAlert';
import { Location } from '@medplum/fhirtypes';

// type StatsGridProps = {
//   data?: { title: string; value: string; diff: number; period?: string; ext?: string; icon?: string }[];
//   error?: ReactNode;
//   paperProps?: PaperProps;
//   loading?: boolean;
// };

type LocationProps = {
  data?: { id: string; name: string; phone: string; numBeds: number; numTotalBeds: number }[];
  locationDetails: { [key: string]: unknown[] };
  error?: boolean | null;
  paperProps?: PaperProps;
};

// export default function StatsGrid({ data, paperProps, error, loading }: StatsGridProps) {
export default function BedStatsGrid({ data, locationDetails, error, paperProps }: LocationProps) {
  // const floorLocation = data?.map((floor) => <BedStatsCard key={floor.id} data={floor} {...paperProps} />);
  console.log('locationDetails', locationDetails);
  const floorLocation = data?.map((floor) => (
    <BedStatsCard key={floor.id} data={floor} locationDetails={locationDetails} {...paperProps} />
  ));

  //TODO: Fix
  const loading = false;

  return (
    <>
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
            : floorLocation}
        </SimpleGrid>
      )}
    </>
  );
}
