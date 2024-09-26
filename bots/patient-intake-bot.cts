import { BotEvent, MedplumClient, createReference, getQuestionnaireAnswers } from '@medplum/core';
import {
  HumanName,
  Organization,
  Patient,
  Practitioner,
  QuestionnaireResponse,
  QuestionnaireResponseItemAnswer,
  Reference,
} from '@medplum/fhirtypes';

type PatientLinkId = 'firstName' | 'lastName' | 'birthdate' | 'diagnosis' | 'chiefComplaint';
type TransferLinkId =
  | 'transferOrigin'
  | 'transferFacility'
  | 'acceptingSpecialty'
  | 'startingLocation'
  | 'primaryAcceptingPhysician';
type TransferPhysLinkId = 'transferPhysFirst' | 'transferPhysLast' | 'transferPhysQual' | 'transferPhysPhone';
type ValidLinkId = PatientLinkId | TransferLinkId | TransferPhysLinkId | 'dateTime' | 'requisitionId';

type ParsedResults = {
  dateTime: string;
  patient: Patient;
  transferringPhysician: Practitioner;
  transferringFacility: Reference | undefined;
  primaryAcceptingPhysician: Reference<Practitioner> | undefined;
  requisitionId: string;
};

const HAYS_MED_REQUISITION_SYSTEM = 'https://haysmed.com/fhir/requisition-id';

export async function handler(medplum: MedplumClient, event: BotEvent<QuestionnaireResponse>): Promise<void> {
  const results = {
    patient: { resourceType: 'Patient' } satisfies Patient,
    transferringFacility: undefined,
    transferringPhysician: { resourceType: 'Practitioner', name: [{}] } satisfies Practitioner,
    primaryAcceptingPhysician: undefined,
  } as ParsedResults;

  if (event.input?.resourceType !== 'QuestionnaireResponse') {
    throw new Error('Invalid input');
  }

  const answers = getQuestionnaireAnswers(event.input);

  const parseAnswer = async (linkId: ValidLinkId, answer: QuestionnaireResponseItemAnswer): Promise<void> => {
    const { patient } = results;

    switch (linkId) {
      case 'dateTime': {
        const dateTime = answer.valueDateTime;
        if (!dateTime) {
          throw new Error('Failed to parse dateTime');
        }
        results.dateTime = dateTime;
        return;
      }
      case 'firstName': {
        const firstName = answer.valueString;
        if (!firstName) {
          throw new Error('Failed to parse valid string from item with linkId firstName');
        }
        if (!patient.name) {
          patient.name = [{ given: [firstName] }];
          return;
        }
        patient.name[0].given = [firstName];
        return;
      }
      case 'lastName': {
        const lastName = answer.valueString;
        if (!lastName) {
          throw new Error('Failed to parse valid string from item with linkId lastName');
        }
        if (!patient.name) {
          patient.name = [{ family: lastName }];
          return;
        }
        patient.name[0].family = lastName;
        return;
      }
      case 'birthdate': {
        const birthDate = answer.valueDate;
        if (!birthDate) {
          throw new Error('Failed to parse date from item with linkId birthdate');
        }
        patient.birthDate = birthDate;
        return;
      }
      case 'diagnosis': {
        const diagnosis = answer.valueCoding;
        if (!diagnosis) {
          throw new Error('Diagnosis not selected');
        }
        // TODO: Parse and create a Condition and/or Observation(s), etc.
        return;
      }
      case 'transferFacility': {
        const transferFacility = answer.valueReference;
        if (!transferFacility) {
          throw new Error('Transferring origin not selected');
        }
        if (!transferFacility.reference?.startsWith('Organization')) {
          throw new Error('Transferring origin is not a valid reference to an Organization');
        }
        results.transferringFacility = transferFacility;
        return;
      }
      case 'acceptingSpecialty': {
        const acceptingSpecialty = answer.valueCoding;
        if (!acceptingSpecialty) {
          throw new Error('Accepting specialty not selected');
        }
        return;
      }
      case 'transferPhysFirst': {
        const transferPhysFirst = answer.valueString;
        if (!transferPhysFirst) {
          throw new Error("Missing transfer physician's first name");
        }
        (results.transferringPhysician.name as HumanName[])[0].given = [transferPhysFirst];
        return;
      }
      case 'transferPhysLast': {
        const transferPhysLast = answer.valueString;
        if (!transferPhysLast) {
          throw new Error("Missing transfer physician's last name");
        }
        (results.transferringPhysician.name as HumanName[])[0].family = transferPhysLast;
        return;
      }
      case 'transferPhysQual': {
        const transferPhysQual = answer.valueString;
        if (!transferPhysQual) {
          return;
        }
        (results.transferringPhysician.name as HumanName[])[0].suffix = transferPhysQual.split(' ');
        return;
      }
      case 'transferPhysPhone': {
        const transferPhysPhone = answer.valueString;
        if (!transferPhysPhone) {
          throw new Error("Missing transfer physician's phone number");
        }
        results.transferringPhysician.telecom = [{ system: 'phone', value: transferPhysPhone }];
        return;
      }
      case 'primaryAcceptingPhysician': {
        const primaryAcceptingPhysician = answer.valueReference;
        if (!primaryAcceptingPhysician) {
          throw new Error('Missing accepting physician');
        }
        results.primaryAcceptingPhysician = primaryAcceptingPhysician as Reference<Practitioner>;
        return;
      }
      case 'requisitionId': {
        const requisitionId = answer.valueString;
        if (!requisitionId) {
          throw new Error('Missing requisitionId');
        }
        results.requisitionId = requisitionId;
        return;
      }
      // case 'startingLocation': {
      //   const primaryAcceptingPhysician = answer.valueReference;
      //   if (!primaryAcceptingPhysician) {
      //     throw new Error('Missing accepting physician');
      //   }
      //   results.primaryAcceptingPhysician = primaryAcceptingPhysician as Reference<Practitioner>;
      //   return;
      // }
      // case 'transferLocation': {
      //   const locRef = item.answer?.[0]?.valueReference;
      //   if (!locRef?.reference) {
      //     throw new Error('Failed to parse valid reference from item with linkId transferLocation');
      //   }
      //   results.nextAvailableRoom = await medplum.searchOne('Location', {
      //     partof: locRef.reference,
      //     'operational-status:not': 'O',
      //     'physical-type': 'ro',
      //   });
      //   if (!results.nextAvailableRoom) {
      //     throw new Error('No available rooms for the given ward');
      //   }
      //   return;
      // }
      default:
      // Ignore linkIds we don't recognize
    }
  };

  for (const [linkId, answer] of Object.entries(answers)) {
    await parseAnswer(linkId as ValidLinkId, answer);
  }

  if (!results.dateTime) {
    throw new Error('Required dateTime not specified');
  }

  if (!(results.patient?.name?.[0]?.given?.length && results.patient?.name?.[0].family && results.patient.birthDate)) {
    throw new Error('Patient details missing or no available room found');
  }

  if (!results.transferringPhysician?.telecom?.[0]) {
    throw new Error('Missing required transfer physician phone number');
  }

  if (!results.transferringFacility) {
    throw new Error('Transferring origin not specified');
  }

  if (!results.primaryAcceptingPhysician) {
    throw new Error('Primary accepting physician not specified');
  }

  if (!results.requisitionId) {
    throw new Error('Missing requisition ID');
  }

  // After processing all items from QuestionnaireResponse,
  // We can process the data we parsed from it

  // Create the patient in Medplum
  // TODO: Create if not exists
  const patient = await medplum.createResource(results.patient);

  // TODO: Create if not exists
  const transferringPhys = await medplum.createResource(results.transferringPhysician);

  // Create a practitioner role for this physician
  await medplum.createResource({
    resourceType: 'PractitionerRole',
    practitioner: createReference(transferringPhys),
    organization: results.transferringFacility as Reference<Organization>,
  });

  // Create service request for transfer
  const svcReq = await medplum.createResource({
    resourceType: 'ServiceRequest',
    // This code is a transfer from another facility
    // https://uts.nlm.nih.gov/uts/umls/vocabulary/SNOMEDCT_US/19712007
    code: {
      coding: [{ system: 'http://snomed.info/sct', code: '19712007', display: 'Patient transfer (procedure)' }],
      text: 'Patient transfer',
    },
    status: 'active',
    intent: 'proposal',
    subject: createReference(patient),
    requester: createReference(transferringPhys),
    // TODO: Add secondary accepting and extension to each physician to indicate primary vs secondary
    performer: [results.primaryAcceptingPhysician],
    supportingInfo: [{ ...createReference(event.input), display: 'Patient Intake Form' }],
    requisition: { system: HAYS_MED_REQUISITION_SYSTEM, value: results.requisitionId },
    authoredOn: new Date().toISOString(),
  });

  // Create communication request for call between transferring and accepting physicians
  const commReq = await medplum.createResource({
    resourceType: 'CommunicationRequest',
    status: 'active',
    payload: [{ contentString: transferringPhys.telecom?.find((val) => val.system === 'phone')?.value as string }],
    basedOn: [createReference(svcReq)],
  });

  // Create a Task for the call
  await medplum.createResource({
    resourceType: 'Task',
    status: 'ready',
    priority: 'asap',
    owner: results.primaryAcceptingPhysician,
    intent: 'plan',
    code: { coding: [{ system: 'http://hl7.org/fhir/CodeSystem/task-code', code: 'fulfill' }] },
    input: [
      {
        type: { coding: [{ code: 'comm_req', display: 'Communication request' }] },
        valueReference: createReference(commReq),
      },
      {
        type: { coding: [{ code: 'subject_patient', display: 'Patient' }] },
        valueReference: createReference(patient),
      },
    ],
    basedOn: [createReference(svcReq)],
    focus: createReference(commReq),
  });

  // Create an encounter to track the Patient's location
  // await medplum.createResource({
  //   resourceType: 'Encounter',
  //   status: 'arrived',
  //   class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: 'inpatient encounter' },
  //   subject: createReference(patient),
  //   location: [
  //     {
  //       location: createReference(results.nextAvailableRoom),
  //       status: 'active',
  //     },
  //   ],
  // });

  // // Mark room as occupied
  // await medplum.patchResource('Location', results.nextAvailableRoom.id as string, [
  //   {
  //     op: 'replace',
  //     path: '/operationalStatus',
  //     value: { system: 'http://terminology.hl7.org/CodeSystem/v2-0116', code: 'O', display: 'Occupied' },
  //   },
  // ]);

  //   const bot = await medplum.readReference(event.bot);

  //   const agentRef = bot.extension?.find((ext) => ext.url === 'https://medplum.com/experimental/agent-reference')
  //     ?.valueReference as Reference<Agent> | undefined;

  //   if (!agentRef) {
  //     throw new Error("Valid Agent reference not found in extension 'https://medplum.com/experimental/agent-reference'");
  //   }

  //   const deviceRef = bot.extension?.find((ext) => ext.url === 'https://medplum.com/experimental/device-reference')
  //     ?.valueReference as Reference<Device> | undefined;

  //   if (!deviceRef) {
  //     throw new Error(
  //       "Valid Device reference not found in extension 'https://medplum.com/experimental/device-reference'"
  //     );
  //   }

  //   console.info(`Sending ADT^A01 to ${getReferenceString(deviceRef)} via ${getReferenceString(agentRef)}`);

  //   const response = await medplum.pushToAgent(
  //     agentRef,
  //     deviceRef,
  //     `MSH|^~\\&|MT ADM||OV ENG|OV ENG FAC|200912231035||ADT^A01^ADT_A01|312424|D|2.4|||AL|NE|
  // EVN||200912231035|||MT^MEDPLUM|200912231033|
  // PID|1||M000000282^^^^MR^ACH00-99-0000^^^^SS^ACH1-20091223103443^^^^PI^ACH 00000331^^^^HUB^ACH||${
  //       results.patient.name[0].family.toUpperCase() as string
  //     }^${
  //       results.patient.name[0].given.join(' ').toUpperCase() as string
  //     }^U^^^^L||19861220|M||C|900 BILL BLVD^^CONWAY^AR^77777||777-888-9999|9990001111||S|CAT|D00000001057|
  // NK1|1|FAKE^CLAUDE|FRI^Friend|1 BILL BLVD^^CONWAY^AR^77777|999-000-1111||NOK|
  // NK1|2|FAKE^MILAN|FRI^Friend|455 BILL BLVD^^CONWAY^AR^77777|999-111-0000||NOT|
  // NK1|3|ACEHARDWAR||1 MAIN STREET^^LITTLE ROCK^^55555||9990001111|EMP|||CLERK|||ACE HARDWARE|||||||||||||||||||||FT|
  // PV1|1|I|SGYOTH^${
  //       results.nextAvailableRoom.name as string
  //     }^A|EMER|||ANG^DOCTOR^SYLVIA^^^^M.D.^^^^^^XX|||CAR||||SELF|||BEA^BEAU^FAKE^L.^^^M.D.^^^^^^XX|IN||BC|||||||||||||||||||DCH||ADM|||2009 12231033||||||||BRAJA^FAKE^JAMES^E^^^M.D.^^^^^^XX|
  // PV2||SGYOTH^3E Surgical Oth|CHEST PAINS|||||||2|1||||||||||||||EMER|20080304||||||||||N|
  // ROL|1|AD|AT|ANG^DOCTOR^SYLVIA^^^^M.D.^^^^^^XX|
  // ROL|2|AD|AD|BEA^BEAU^FAKE^L.^^^M.D.^^^^^^XX|
  // ROL|3|AD|FHCP|BRAJA^FAKE^JAMES^E^^^M.D.^^^^^^XX|
  // ROL|4|AD|PP|NJ^DOCTOR^NEW JERSEY^P.^^^M.D.^^^^^^XX|
  // ROL|5|AD|CP|ANP^AFAKENAME^PAUL^J.^^^M.D.^^^^^^XX|
  // OBX|1|TX|ADM.ACC^ACCIDENT DESCRIPTION^ADM||CAR REAR ENDED||||||F|
  // OBX|2|CE|ADM.ACCF^ACCIDENT FORM COMPLETED^ADM||Y^Y||||||F|
  // OBX|3|CE|ADM.CAR^What type of child passenger seat do you currently utilize?^ADM||DUA^Don't Use Anything||||||F|
  // OBX|4|CE|ADM.CARH2^safety seats?^ADM||PNA^Parent Not Available||||||F|
  // OBX|5|TX|ADM.COUNTY^County of Residence^ADM||LIN||||||F|
  // OBX|6|TX|ADM.FDBC4^alarms in your home?^ADM||N||||||F|
  // OBX|7|TX|ADM.GDOB^Guarantor DOB:^ADM||19861220||||||F|
  // OBX|8|TX|ADM.INCON^Consent Signed, Relationship^ADM||Y||||||F|
  // OBX|9|CE|ADM.LW^Age 18 or Older, Living Will Info Presented?^ADM||NA^NA||||||F|
  // OBX|10|TX|ADM.LWF^Living Will on File?^ADM||N||||||F|
  // OBX|11|TX|ADM.LWH^If No, Is Help Needed in Writing a Living Will?^ADM||N||||||F|
  // OBX|12|TX|ADM.PARREF^Parent refused to add patient to policy^ADM||N||||||F|
  // OBX|13|TX|ADM.RES^Team Resident^ADM||ANDP||||||F|
  // OBX|14|CE|ADM.RISK^Risk Indicator^ADM||MUD^UNRELATED DONOR||||||F|
  // OBX|15|TX|ADM.TRAU^Trauma?^ADM||N||||||F|
  // OBX|16|TX|ADM.TRN^Transplant Donor Account Number^ADM||9088889999||||||F|
  // OBX|17|TX|ADM USCIT^Patient U.S. Citizen^INS^^^BC/BS||Y||||||F|
  // OBX|18|TX|BAR ELIG^BAR Eligibilty Check^INS^^^BC/BS||||||||F|
  // AL1|1|DA|X1175^Naphazoline^^From 20/20 Eye Drops^^allergy.id|MI||20091223|
  // AL1|2|DA|X1271^Zinc^^From 20/20 Eye Drops^^allergy.id|MI||20091223|
  // AL1|3|DA|X13480^Mineral, Zinc^^From 20/20 Eye Drops^^allergy.id|MI||20091223|
  // AL1|4|DA|X737^Glycerin^^From 20/20 Eye Drops^^allergy.id|MI||20091223|
  // DG1|1||004.2^SHIGELLA BOYDII^I9|||Other|
  // GT1|1||FAKE^PATIENT^U||900 BILL BLVD^^CONWAY^AR^77777|999-888-0000|||||S|999-00-0000||||ACEHARDWAR|1 MAIN STREET^^LITTLE ROCK^AK^55555|9990001111|
  // IN1|1|BC/BS||BLUE CROSS/BLUE SHIELD|PO BOX 2181^^LITTLE ROCK^AR^72203-2181||(501)378-2307|9098AAAAS|ACE HARDWARE||ACEHARDWAR|20090101|20091231|||FAKE^PATIENT^U|S|19861220|900 BILL BLVD^^CONWAY^AR^77777||||||||||20091223|MT||||||123456789||||||FT^Employed Full Time|M|^^LITTLE ROCK|VERIFIED|
  // IN2|1|999-00-0000|||||||||||||||||||||||||||||||Y|||||||||C|S||||||||||||||||||||999-888-0000|
  // IN3|1|CERTIFICATE NUMBER 123||||20130819|||20130819|20140819|
  // IN1|2|BHC||BUYER'S HEALTHCARE COALITION|P.O. BOX 150500^^NASHVILLE^TN^37215||800-366-9768|90OPOAOSAAABOO1|ACE HARDWARE||ACEHARDWAR|20090601|20091231|||FAKE^PATIENT^U|S|19861220|900 BILL CLINTON BLVD^^CONWAY^AR^77777||||||||||20091223|MT||||||90000TTTTATTATATAT||||||FT^Employed Full Time|M|^^LITTLE ROCK|VERIFIED|
  // IN2|2|999-00-0000|||||||||||||||||||||||||||||||Y|||||||||C|S||||||||||||||||||||999-888-0000|
  // IN3|1|CERTIFICATE NUMBER 222||||20130819|||20130819|20140819|
  // UB2|1||||||01^20091222|`,
  //     ContentType.HL7_V2,
  //     true
  //   );

  //   const hl7Response = Hl7Message.parse(response as string);
  //   console.info(`Device responded with: ${hl7Response.toString()}`);
}
