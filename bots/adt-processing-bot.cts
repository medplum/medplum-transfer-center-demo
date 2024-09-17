import { BotEvent, Hl7Message, MedplumClient, resolveId } from '@medplum/core';

const LEVEL_TRANSFORMS = {
  CPCU: 'PCU',
  ER: 'ED',
} as Record<string, string>;

const ROOM_TRANSFORMS = {
  '3SURG': (roomNo: string) => roomNo.replaceAll('B', ''),
  ACUTE: (roomNo: string) => roomNo.replaceAll('A', ''),
  ED: (roomNo: string) => roomNo.replaceAll('ED.RM', ''),
  MPCU: (roomNo: string) => roomNo.replaceAll('C', ''),
  IPREHAB: (roomNo: string) => roomNo.replaceAll('R', ''),
} as Record<string, (roomNo: string) => string>;

const RELEVANT_LEVELS = ['PCU', '3SURG', 'OBGYN', 'IPREHAB', 'ACUTE', 'MPCU', 'MSICU', 'ED'] as const;
type RelevantLevel = (typeof RELEVANT_LEVELS)[number];
const ACCEPTED_ADTS = ['A01', 'A03', 'A08'] as const;
type AcceptedAdt = (typeof ACCEPTED_ADTS)[number];

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<Hl7Message> {
  const input = event.input as Hl7Message;

  // Log Message Type
  const messageType = input.getSegment('MSH')?.getField(9)?.getComponent(1) as string;
  const messageSubtype = input.getSegment('MSH')?.getField(9)?.getComponent(2) as AcceptedAdt | undefined;

  // If this is anything but ADT then exit
  if (messageType !== 'ADT') {
    return input.buildAck();
  }

  // Only accept ADTs we care about
  if (!(messageSubtype && ACCEPTED_ADTS.includes(messageSubtype))) {
    return input.buildAck();
  }

  switch (messageSubtype) {
    case 'A01': {
      // Current location = occupied
      const currLocName = getCurrentLocation(input);
      if (!currLocName) {
        console.error('No valid location found in segment PV1.3');
        return input.buildAck();
      }

      // Do query for location
      const currentLocation = await medplum.searchOne('Location', `name=${currLocName}`);
      if (!currentLocation) {
        console.error(`Could not find room with name '${currLocName}'`);
        return input.buildAck();
      }

      // Check if the currentLocation is already occupied
      // If so, don't do anything
      if (currentLocation.operationalStatus?.code !== 'O') {
        // Mark room as occupied
        await medplum.patchResource('Location', resolveId(currentLocation) as string, [
          {
            op: 'replace',
            path: '/operationalStatus',
            value: { system: 'http://terminology.hl7.org/CodeSystem/v2-0116', code: 'O', display: 'Occupied' },
          },
        ]);
      }
      return input.buildAck();
    }
    // TODO: We could use these to upsert patient before they are admitted
    // case 'A04':
    // case 'A05':
    case 'A03': {
      // "The patient’s location prior to discharge should be entered in PV1-3 - Assigned Patient Location."
      // Source: https://hl7-definition.caristix.com/v2/HL7v2.5/TriggerEvents/ADT_A03#:~:text=The%20patient%E2%80%99s%20location%20prior%20to%20discharge%20should%20be%20entered%20in%20PV1%2D3%20%2D%20Assigned%20Patient%20Location.

      // Check CURRENT LOCATION
      // SET CURRENT LOCATION AS UNOCCUPIED
      const currLocName = getCurrentLocation(input);
      if (!currLocName) {
        console.error('No valid location found in segment PV1.3');
        return input.buildAck();
      }

      // Do query for location
      const currentLocation = await medplum.searchOne('Location', `name=${currLocName}`);
      if (!currentLocation) {
        console.error(`Could not find room with name '${currLocName}'`);
        return input.buildAck();
      }

      // Check if the currentLocation is already occupied
      // If so, don't do anything
      if (currentLocation.operationalStatus?.code !== 'U') {
        // Mark room as occupied
        await medplum.patchResource('Location', resolveId(currentLocation) as string, [
          {
            op: 'replace',
            path: '/operationalStatus',
            value: { system: 'http://terminology.hl7.org/CodeSystem/v2-0116', code: 'U', display: 'Unoccupied' },
          },
        ]);
      }
      return input.buildAck();
    }
    case 'A08': {
      // IF PREV LOCATION && PREV LOCATION !== NEW LOCATION
      // SET PREV LOCATION AS UNOCCUPIED
      // SET NEW LOCATION AS OCCUPIED
      // Update the operationalStatus of the room
      const currLocName = getCurrentLocation(input);
      const prevLocName = getPreviousLocation(input);

      if (prevLocName && prevLocName !== currLocName) {
        // Do query for location
        const previousLocation = await medplum.searchOne('Location', `name=${prevLocName}`);
        if (previousLocation) {
          // Check if the currentLocation is already occupied
          // If so, don't do anything
          if (previousLocation.operationalStatus?.code !== 'U') {
            // Mark room as occupied
            await medplum.patchResource('Location', resolveId(previousLocation) as string, [
              {
                op: 'replace',
                path: '/operationalStatus',
                value: { system: 'http://terminology.hl7.org/CodeSystem/v2-0116', code: 'U', display: 'Unoccupied' },
              },
            ]);
          }
        } else {
          console.error(`Could not find room with name '${prevLocName}'`);
        }
      }

      if (currLocName) {
        // Do query for location
        const currentLocation = await medplum.searchOne('Location', `name=${currLocName}`);
        if (!currentLocation) {
          console.error(`Could not find room with name '${currLocName}'`);
          return input.buildAck();
        }

        // Check if the currentLocation is already occupied
        // If so, don't do anything
        if (currentLocation.operationalStatus?.code !== 'O') {
          // Mark room as occupied
          await medplum.patchResource('Location', resolveId(currentLocation) as string, [
            {
              op: 'replace',
              path: '/operationalStatus',
              value: { system: 'http://terminology.hl7.org/CodeSystem/v2-0116', code: 'O', display: 'Occupied' },
            },
          ]);
        }
      }

      return input.buildAck();
    }
  }
}

/**
 *
 * @param msg - The HL7 message to parse.
 * @returns the location as a string if the location is valid.
 *
 * A Location is only valid if it consists of both a level and a room number AND is a relevant level.
 */
function getCurrentLocation(msg: Hl7Message): string | undefined {
  // PV1.3 = Patient Location

  // Parse ward from PV1.3.1
  const level = msg.getSegment('PV1')?.getField(3).getComponent(1);
  // Parse room from PV1.3.2
  const roomNo = msg.getSegment('PV1')?.getField(3).getComponent(2);

  return parseLocation(level, roomNo);
}

/**
 *
 * @param msg - The HL7 message to parse.
 * @returns the location as a string if the location is valid.
 *
 * A Location is only valid if it consists of both a level and a room number AND is a relevant level.
 */
function getPreviousLocation(msg: Hl7Message): string | undefined {
  // PV1.6 = Patient Prior Location

  // Parse ward from PV1.6.1
  const level = msg.getSegment('PV1')?.getField(6).getComponent(1);
  // Parse room from PV1.6.2
  const roomNo = msg.getSegment('PV1')?.getField(6).getComponent(2);

  return parseLocation(level, roomNo);
}

function parseLocation(level: string | undefined, roomNo: string | undefined): string | undefined {
  // We have a separate case for when both level and roomNo are undefined, since this means the segment is probably just empty
  if (!level && !roomNo) {
    return undefined;
  }

  if (!level) {
    console.error('Level is missing from location');
    return undefined;
  }

  const normalizedLevel = normalizeLevel(level);

  if (!isRelevantLevel(normalizedLevel)) {
    console.warn(`'${normalizedLevel}' is not a relevant level`);
    return undefined;
  }

  if (!roomNo) {
    console.error('Room number is missing from location');
    return undefined;
  }

  const normalizedRoom = normalizeRoom(level, roomNo);

  return `${normalizedLevel} ${normalizedRoom}`;
}

function normalizeLevel(level: string): string {
  if (LEVEL_TRANSFORMS[level]) {
    console.info(`Normalizing '${level}' to '${LEVEL_TRANSFORMS[level]}'`);
    return LEVEL_TRANSFORMS[level];
  }
  return level;
}

function normalizeRoom(level: string, roomNo: string): string {
  if (ROOM_TRANSFORMS[level]) {
    const normalized = ROOM_TRANSFORMS[level](roomNo);
    console.info(`Normalizing '${roomNo}' to '${normalized}'`);
    return normalized;
  }
  return roomNo;
}

function isRelevantLevel(level: string): level is RelevantLevel {
  return RELEVANT_LEVELS.includes(level as RelevantLevel);
}
