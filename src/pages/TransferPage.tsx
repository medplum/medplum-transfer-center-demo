import { Container, PaperProps, Stack, Title } from '@mantine/core';
import { Location } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useEffect, useMemo, useState } from 'react';

import BedStatsGrid from '@/components/BedStatsGrid';

const PAPER_PROPS: PaperProps = {
  p: 'md',
  shadow: 'md',
  radius: 'md',
  style: { height: '100%' },
};

interface ExtendedLocation extends Location {
  availableBeds: number;
  numTotalBeds: number;
  phone: string;
}

const parentOrgId = 'ba836894-122f-42d0-874b-83ea9557e4f3';

export function TransferPage(): JSX.Element {
  const medplum = useMedplum();

  const [locations, setLocations] = useState<ExtendedLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const [locationDetails, setLocationDetails] = useState<{ [key: string]: Location[] }>({});

  useEffect(() => {
    async function fetchLocations(): Promise<void> {
      try {
        setLoadingLocations(true);
        const result = await medplum.graphql(`
        {
          Location(id: "${parentOrgId}") {
            id
            name
            LocationList(_reference: partof, physicalType: "lvl") {
              id
              name
              telecom(system: "phone") {
                value
              }
              occupiedLocations: LocationList(_reference: partof, physicalType: "ro", operational_status: "O") {
                id
              }
              unoccupiedLocations: LocationList(_reference: partof, physicalType: "ro", operational_status: "U") {
                id
              }
            }
          }
        }
      `);

        const locations = [] as ExtendedLocation[];
        for (const level of result.data.Location.LocationList) {
          locations.push({
            ...level,
            numTotalBeds: level.occupiedLocations.length + level.unoccupiedLocations.length,
            availableBeds: level.unoccupiedLocations.length,
            phone: level.telecom?.[0]?.value,
          });

          setLocationDetails((prevDetails) => ({
            ...prevDetails,
            [String(level.id as string)]: [...level.occupiedLocations, ...level.unoccupiedLocations],
          }));
        }
        setLocations(locations);

        console.log(result.data.Location.LocationList);
      } catch (error) {
        setLocationsError('Failed to fetch locations');
      } finally {
        setLoadingLocations(false);
      }
    }

    fetchLocations().catch(console.error);
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
      </Stack>
    </Container>
  );
}
