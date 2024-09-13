import { BotEvent, Hl7Message, MedplumClient } from '@medplum/core';
import { Location } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<Hl7Message> {
  const input = event.input as Hl7Message;

  // Log Message Type
  const messageType = input.getSegment('MSH')?.getField(9)?.getComponent(1) as string;
  const messageSubtype = input.getSegment('MSH')?.getField(9)?.getComponent(2) as 'A01' | 'A03' | undefined;

  // If this is anything but ADT then exit
  if (messageType !== 'ADT') {
    return input.buildAck();
  }

  // TODO: Use A02 instead of A01?
  const acceptedAdts = ['A01', 'A03'] as const;
  if (!(messageSubtype && acceptedAdts.includes(messageSubtype))) {
    return input.buildAck();
  }

  // Parse ward from PV1.3.1
  const level = input.getSegment('PV1')?.getField(3).getComponent(1);
  // Parse room from PV1.3.2
  const roomNo = input.getSegment('PV1')?.getField(3).getComponent(2);

  const query = level ? `name=${level} ${roomNo}` : `name=${roomNo}`;

  // Find corresponding room in project'
  const roomLocation = await medplum.searchOne('Location', query);
  if (!roomLocation) {
    throw new Error(`Could not find room ${roomNo}`);
  }

  // Determine which code to use for operationalStatus
  let code: string;
  let display: string;
  switch (messageSubtype) {
    case 'A01':
      code = 'O';
      display = 'Occupied';
      break;
    case 'A03':
      code = 'U';
      display = 'Unoccupied';
      break;
  }

  // Update the operationalStatus of the room
  await medplum.updateResource({
    ...roomLocation,
    operationalStatus: {
      system: 'http://terminology.hl7.org/CodeSystem/v2-0116',
      code,
      display,
    },
  } satisfies Location);

  // Return Ack
  return input.buildAck();
}
