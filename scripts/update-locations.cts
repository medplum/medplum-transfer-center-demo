import { MedplumClient } from '@medplum/core';

const parentOrgId = 'ba836894-122f-42d0-874b-83ea9557e4f3';

async function main(): Promise<void> {
  if (!(process.env['MEDPLUM_CLIENT_ID'] && process.env['MEDPLUM_CLIENT_SECRET'])) {
    throw new Error(
      'Both MEDPLUM_CLIENT_ID and MEDPLUM_CLIENT_SECRET env vars must be defined before running this script'
    );
  }

  const medplum = new MedplumClient({
    clientId: process.env['MEDPLUM_CLIENT_ID'],
    clientSecret: process.env['MEDPLUM_CLIENT_SECRET'],
  });

  // Get all LEVEL-type Location
  const locations = await medplum.searchResources('Location', { partof: `Location/${parentOrgId}` });
  for (const location of locations) {
    await medplum.updateResource({
      ...location,
      telecom: [
        {
          system: 'phone',
          value: '555-555-5555',
        },
      ],
    });
    const nestedLocations = await medplum.searchResources('Location', { partof: `Location/${location.id as string}` });
    for (const nested of nestedLocations) {
      await medplum.updateResource({
        ...nested,
        operationalStatus: {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0116',
          code: 'U',
          display: 'Unoccupied',
        },
      });
    }
  }
}

main().catch(console.error);
