import { useEffect, useState, useMemo } from 'react';
import { Stack, Container, PaperProps, Title } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { Location } from '@medplum/fhirtypes';

import BedStatsGrid from '@/components/BedStatsGrid';

const PAPER_PROPS: PaperProps = {
  p: 'md',
  shadow: 'md',
  radius: 'md',
  style: { height: '100%' },
};

interface ExtendedLocation extends Location {
  numBeds: number;
  numTotalBeds: number;
}

export function TransferPage(): JSX.Element {
  const medplum = useMedplum();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const [locationDetails, setLocationDetails] = useState<{ [key: string]: Location[] }>({});

  useEffect(() => {
    const parentOrgId = 'Location/ba836894-122f-42d0-874b-83ea9557e4f3';
    const searchParams = {
      partof: parentOrgId,
    };

    const fetchLocations = async (): Promise<void> => {
      try {
        setLoadingLocations(true);
        const results = await medplum.searchResources('Location', searchParams);
        const filteredResults = results.filter((location: Location) => {
          return location.physicalType?.coding?.[0]?.display === 'Level';
        });

        // Initialize the bed count for each location
        const floorLocationData: ExtendedLocation[] = filteredResults.map((location: Location) => ({
          ...location,
          numBeds: 0,
          numTotalBeds: 0,
        }));

        // TODO: get the bed count for each location
        const bedCountPromises = floorLocationData.map(async (location) => {
          const locationId = `Location/${location.id}`;
          const locationSearchParams = {
            partof: locationId,
          };

          const bedLocationResults = await medplum.searchResources('Location', locationSearchParams);

          const numBeds = bedLocationResults.length;
          location.numBeds = numBeds - Math.floor(Math.random() * 5);
          location.numTotalBeds = numBeds;

          setLocationDetails((prevDetails) => ({
            ...prevDetails,
            [String(location.id)]: bedLocationResults as Location[],
          }));
        });

        await Promise.all(bedCountPromises);

        setLocations(floorLocationData);
        console.log('floorLocationData', floorLocationData);
      } catch (error) {
        setLocationsError('Failed to fetch locations');
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, [medplum]);

  const paperProps = useMemo(() => PAPER_PROPS, []);

  if (loadingLocations) {
    return <div>Loading...</div>;
  }

  if (locationsError) {
    return <div>Error: {locationsError}</div>;
  }

  // TODO: fix
  const error = false;

  return (
    <Container fluid>
      <Stack gap="lg">
        <Title>Transfer Center</Title>
        <BedStatsGrid data={locations} locationDetails={locationDetails} error={error} paperProps={paperProps} />
        {/* <BedStatsGrid data={statsData} error={statsError} loading={statsLoading} paperProps={paperProps} /> */}
        {/* <Paper {...paperProps}>
          <TransferStatusTable data={transferData.slice(0, 7)} error={transferError} loading={transferLoading} />
        </Paper> */}
      </Stack>
    </Container>
  );
}
