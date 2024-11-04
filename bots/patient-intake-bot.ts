import {
  BotEvent,
  LOINC,
  MedplumClient,
  SNOMED,
  UCUM,
  createReference,
  getAllQuestionnaireAnswers,
  getQuestionnaireAnswers,
  resolveId,
} from '@medplum/core';
import {
  AllergyIntolerance,
  Bundle,
  BundleEntry,
  CodeableConcept,
  Coding,
  CommunicationRequest,
  Observation,
  ObservationComponent,
  Organization,
  Patient,
  Practitioner,
  QuestionnaireResponse,
  Reference,
  Resource,
  ServiceRequest,
  Task,
} from '@medplum/fhirtypes';
import { HAYS_MED_REQUISITION_SYSTEM, PATIENT_INTAKE_QUESTIONNAIRE_NAME } from '@/lib/common';
import { randomUUID } from 'crypto';

// TODO: Move these constants to a utility file
const VITAL_SIGNS_CATEGORY: CodeableConcept = {
  coding: [
    {
      system: 'http://terminology.hl7.org/CodeSystem/observation-category',
      code: 'vital-signs',
      display: 'Vital Signs',
    },
  ],
  text: 'Vital Signs',
};

const OBSERVATIONS_CODE_MAP: Record<string, CodeableConcept> = {
  bloodPressure: { coding: [{ system: LOINC, code: '85354-9', display: 'Blood Pressure' }] },
  bodyHeight: { coding: [{ system: LOINC, code: '8302-2', display: 'Body height' }] },
  bodyTemperature: { coding: [{ system: LOINC, code: '8310-5', display: 'Body temperature' }] },
  bodyWeight: { coding: [{ system: LOINC, code: '29463-7', display: 'Body weight' }] },
  chiefComplaint: {
    coding: [
      { system: LOINC, code: '46239-0', display: 'Chief complaint' },
      { system: SNOMED, code: '1269489004', display: 'Chief complaint' },
    ],
  },
  heartRate: { coding: [{ system: LOINC, code: '8867-4', display: 'Heart rate' }] },
  respiratoryRate: { coding: [{ system: LOINC, code: '9279-1', display: 'Respiratory rate' }] },
  oxygenSaturation: {
    coding: [
      {
        system: LOINC,
        code: '2708-6',
        display: 'Oxygen saturation in Arterial blood',
      },
      {
        system: LOINC,
        code: '59408-5',
        display: 'Oxygen saturation in Arterial blood by Pulse oximetry',
      },
    ],
    text: 'Oxygen saturation',
  },
};

export async function handler(medplum: MedplumClient, event: BotEvent<QuestionnaireResponse>): Promise<Bundle> {
  const { input } = event;

  if (input.resourceType !== 'QuestionnaireResponse') {
    throw new Error('Invalid input');
  }

  if (!input.questionnaire) {
    throw new Error('Questionnaire is required');
  }

  await medplum
    .readResource('Questionnaire', resolveId({ reference: input.questionnaire }) as string)
    .then((questionnaire) => {
      if (questionnaire.name !== PATIENT_INTAKE_QUESTIONNAIRE_NAME) {
        throw new Error('Invalid questionnaire');
      }
    });

  function parseAnswers(): BundleEntry[] {
    const entries: BundleEntry[] = [];

    const answers = getQuestionnaireAnswers(input);

    const requisitionId = answers['requisitionId']?.valueString;
    if (!requisitionId) {
      throw new Error('Missing required requisitionId');
    }

    const dateTime = answers['dateTime']?.valueDateTime;
    if (!dateTime) {
      throw new Error('Missing required Date/Time');
    }

    const effectiveDateTime = new Date(dateTime).toISOString();

    // Patient Info
    const patient: Patient = { resourceType: 'Patient' };
    const patientFirstName = answers['firstName']?.valueString;
    const patientLastName = answers['lastName']?.valueString;
    if (!patientFirstName || !patientLastName) {
      throw new Error('Missing required Patient Name');
    }
    patient.name = [{ given: [patientFirstName], family: patientLastName }];

    const patientBirthdate = answers['birthdate']?.valueDate;
    if (!patientBirthdate) {
      throw new Error('Missing required Patient Birthdate');
    }
    patient.birthDate = patientBirthdate;

    const patientPhone = answers['phone']?.valueString;
    if (patientPhone) {
      patient.telecom = [{ system: 'phone', value: patientPhone }];
    }

    const patientStreet = answers['street']?.valueString;
    const patientCity = answers['city']?.valueString;
    const patientState = answers['state']?.valueCoding?.code;
    const patientPostalCode = answers['postalCode']?.valueString;
    if (patientStreet || patientCity || patientState || patientPostalCode) {
      patient.address = [
        {
          use: 'home',
          type: 'physical',
          line: patientStreet ? [patientStreet] : [],
          city: patientCity,
          state: patientState,
          postalCode: patientPostalCode,
        },
      ];
    }

    const patientEntry = createEntry(patient);
    entries.push(patientEntry);
    const patientReference = { ...createReference(patientEntry.resource as Patient), reference: patientEntry.fullUrl };

    // Vital Signs
    const heartRate = answers['heartRate']?.valueInteger;
    if (heartRate !== undefined && heartRate < 0) {
      throw new Error('Invalid Heart Rate');
    }
    const heartRateObservation = createObservation({
      patient: patientReference,
      response: input,
      effectiveDateTime,
      category: VITAL_SIGNS_CATEGORY,
      code: OBSERVATIONS_CODE_MAP.heartRate,
      valueQuantity: {
        value: heartRate,
        unit: 'beats/min',
        system: UCUM,
        code: '/min',
      },
    });
    if (heartRateObservation) entries.push(createEntry(heartRateObservation));

    const bloodPressureDiastolic = answers['bloodPressureDiastolic']?.valueInteger;
    if (bloodPressureDiastolic !== undefined && bloodPressureDiastolic < 0) {
      throw new Error('Invalid Blood Pressure Diastolic');
    }
    const bloodPressureSystolic = answers['bloodPressureSystolic']?.valueInteger;
    if (bloodPressureSystolic !== undefined && bloodPressureSystolic < 0) {
      throw new Error('Invalid Blood Pressure Systolic');
    }
    const bloodPressureObservation = createObservation({
      patient: patientReference,
      response: input,
      effectiveDateTime,
      category: VITAL_SIGNS_CATEGORY,
      code: OBSERVATIONS_CODE_MAP.bloodPressure,
      component: createBloodPressureObservationComponent({
        diastolic: bloodPressureDiastolic,
        systolic: bloodPressureSystolic,
      }),
    });
    if (bloodPressureObservation) entries.push(createEntry(bloodPressureObservation));

    const temperature = answers['temperature']?.valueDecimal;
    const temperatureObservation = createObservation({
      patient: patientReference,
      response: input,
      effectiveDateTime,
      category: VITAL_SIGNS_CATEGORY,
      code: OBSERVATIONS_CODE_MAP.bodyTemperature,
      valueQuantity: {
        value: temperature,
        unit: 'F',
        system: UCUM,
        code: '[degF]',
      },
    });
    if (temperatureObservation) entries.push(createEntry(temperatureObservation));

    const respiratoryRate = answers['respiratoryRate']?.valueDecimal;
    if (respiratoryRate !== undefined && respiratoryRate < 0) {
      throw new Error('Invalid Respiratory Rate');
    }
    const respiratoryRateObservation = createObservation({
      patient: patientReference,
      response: input,
      effectiveDateTime,
      category: VITAL_SIGNS_CATEGORY,
      code: OBSERVATIONS_CODE_MAP.respiratoryRate,
      valueQuantity: {
        value: respiratoryRate,
        unit: 'breaths/min',
        system: UCUM,
        code: '/min',
      },
    });
    if (respiratoryRateObservation) entries.push(createEntry(respiratoryRateObservation));

    const oxygenSaturation = answers['oxygenSaturation']?.valueDecimal;
    const oxygenSaturationObservation = createObservation({
      patient: patientReference,
      response: input,
      effectiveDateTime,
      category: VITAL_SIGNS_CATEGORY,
      code: OBSERVATIONS_CODE_MAP.oxygenSaturation,
      valueQuantity: {
        value: oxygenSaturation,
        unit: '%O2',
        system: UCUM,
        code: '%',
      },
    });
    if (oxygenSaturationObservation) entries.push(createEntry(oxygenSaturationObservation));

    const height = answers['height']?.valueDecimal;
    const heightObservation = createObservation({
      patient: patientReference,
      response: input,
      effectiveDateTime,
      category: VITAL_SIGNS_CATEGORY,
      code: OBSERVATIONS_CODE_MAP.bodyHeight,
      valueQuantity: {
        value: height,
        unit: 'in_i',
        system: UCUM,
        code: '[in_i]',
      },
    });
    if (heightObservation) entries.push(createEntry(heightObservation));

    const weight = answers['weight']?.valueDecimal;
    const weightObservation = createObservation({
      patient: patientReference,
      response: input,
      effectiveDateTime,
      category: VITAL_SIGNS_CATEGORY,
      code: OBSERVATIONS_CODE_MAP.bodyWeight,
      valueQuantity: {
        value: weight,
        unit: 'lb_av',
        system: UCUM,
        code: '[lb_av]',
      },
    });
    if (weightObservation) entries.push(createEntry(weightObservation));

    // Allergies
    const allergyAnswers = getAllQuestionnaireAnswers(input)['allergySubstance'] || [];
    for (const allergyAnswer of allergyAnswers) {
      const allergy = createAllergy({ allergy: allergyAnswer.valueCoding, patient: patientReference });
      if (allergy) entries.push(createEntry(allergy));
    }

    // Chief Complaint
    const chiefComplaint = answers['chiefComplaint']?.valueCoding;
    if (chiefComplaint) {
      const chiefComplaintObservation = createObservation({
        patient: patientReference,
        response: input,
        effectiveDateTime,
        code: OBSERVATIONS_CODE_MAP.chiefComplaint,
        valueCodeableConcept: { coding: [chiefComplaint] },
      });
      if (chiefComplaintObservation) entries.push(createEntry(chiefComplaintObservation));
    }

    // Transfer Info
    const transferFacility = answers['transferFacility']?.valueReference;
    if (!transferFacility?.reference?.startsWith('Organization')) {
      throw new Error('Transferring origin is not a valid reference to an Organization');
    }

    const transferringPhysician: Practitioner = { resourceType: 'Practitioner' };
    const transferPhysFirst = answers['transferPhysFirst']?.valueString;
    const transferPhysLast = answers['transferPhysLast']?.valueString;
    if (!transferPhysFirst || !transferPhysLast) {
      throw new Error('Missing required Transferring Physician Name');
    }
    transferringPhysician.name = [{ given: [transferPhysFirst], family: transferPhysLast }];

    const transferPhysQual = answers['transferPhysQual']?.valueString;
    if (transferPhysQual) {
      transferringPhysician.name[0].suffix = transferPhysQual.split(' ');
    }

    const transferPhysPhone = answers['transferPhysPhone']?.valueString;
    if (!transferPhysPhone) {
      throw new Error('Missing required Transferring Physician Phone');
    }
    transferringPhysician.telecom = [{ system: 'phone', value: transferPhysPhone }];

    const transferringPhysicianEntry = createEntry(transferringPhysician);
    const transferringPhysicianReference = {
      ...createReference(transferringPhysician),
      reference: transferringPhysicianEntry.fullUrl,
    };
    entries.push(transferringPhysicianEntry);
    entries.push(
      createEntry({
        resourceType: 'PractitionerRole',
        practitioner: transferringPhysicianReference,
        organization: transferFacility as Reference<Organization>,
      })
    );

    // Create service request for transfer
    const serviceRequest: ServiceRequest = {
      resourceType: 'ServiceRequest',
      // This code is a transfer from another facility
      // https://uts.nlm.nih.gov/uts/umls/vocabulary/SNOMEDCT_US/19712007
      code: {
        coding: [{ system: 'http://snomed.info/sct', code: '19712007', display: 'Patient transfer (procedure)' }],
        text: 'Patient transfer',
      },
      status: 'active',
      intent: 'proposal',
      subject: patientReference,
      requester: transferringPhysicianReference,
      supportingInfo: [{ ...createReference(event.input), display: 'Patient Intake Form' }],
      requisition: { system: HAYS_MED_REQUISITION_SYSTEM, value: requisitionId },
      authoredOn: new Date().toISOString(),
    };
    const serviceRequestEntry = createEntry(serviceRequest);
    const serviceRequestReference = { ...createReference(serviceRequest), reference: serviceRequestEntry.fullUrl };
    entries.push(serviceRequestEntry);

    // Create communication request for call between transferring and accepting physicians
    const communicationRequest: CommunicationRequest = {
      resourceType: 'CommunicationRequest',
      status: 'active',
      payload: [
        { contentString: transferringPhysician.telecom?.find((val) => val.system === 'phone')?.value as string },
      ],
      basedOn: [serviceRequestReference],
    };
    const communicationRequestEntry = createEntry(communicationRequest);
    const communicationRequestReference = {
      ...createReference(communicationRequest),
      reference: communicationRequestEntry.fullUrl,
    };
    entries.push(communicationRequestEntry);

    // Create a Task for the call
    const callTask: Task = {
      resourceType: 'Task',
      status: 'ready',
      priority: 'asap',
      intent: 'plan',
      code: { coding: [{ system: 'http://hl7.org/fhir/CodeSystem/task-code', code: 'fulfill' }] },
      input: [
        {
          type: { coding: [{ code: 'comm_req', display: 'Communication request' }] },
          valueReference: communicationRequestReference,
        },
        {
          type: { coding: [{ code: 'subject_patient', display: 'Patient' }] },
          valueReference: patientReference,
        },
      ],
      basedOn: [serviceRequestReference],
      focus: communicationRequestReference,
    };
    entries.push(createEntry(callTask));

    return entries;
  }

  const entries = parseAnswers();

  // Execute the batch to create all resources at once
  const responseBundle = await medplum.executeBatch({
    resourceType: 'Bundle',
    type: 'batch',
    entry: entries,
  });

  return responseBundle;

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

// TODO: Move these functions to a utility file
function createEntry(resource: Resource): BundleEntry {
  return {
    resource,
    // Creating internal references is done by assigning temporary IDs to each bundle entry
    fullUrl: `urn:uuid:${randomUUID()}`,
    request: {
      url: resource.resourceType,
      method: 'POST',
    },
  };
}

function createObservation({
  patient,
  response,
  effectiveDateTime,
  category,
  code,
  valueQuantity,
  valueCodeableConcept,
  component,
}: {
  patient: Reference<Patient>;
  response: QuestionnaireResponse;
  effectiveDateTime: string;
  category?: CodeableConcept;
  code: CodeableConcept;
  valueQuantity?: Observation['valueQuantity'];
  valueCodeableConcept?: Observation['valueCodeableConcept'];
  component?: ObservationComponent[];
}): Observation | undefined {
  if (!valueQuantity && !valueCodeableConcept && !component) return undefined;

  const observation: Observation = {
    resourceType: 'Observation',
    status: 'final',
    subject: patient,
    effectiveDateTime,
    derivedFrom: [createReference(response)],
    code,
  };

  if (category) {
    observation.category = [category];
  }

  if (valueQuantity) {
    observation.valueQuantity = valueQuantity;
  } else if (valueCodeableConcept) {
    observation.valueCodeableConcept = valueCodeableConcept;
  }

  if (component) {
    observation.component = component;
  }

  return observation;
}

function createBloodPressureObservationComponent({
  diastolic,
  systolic,
}: {
  diastolic?: number;
  systolic?: number;
}): ObservationComponent[] {
  const components: ObservationComponent[] = [];

  if (diastolic) {
    components.push({
      code: {
        coding: [
          {
            system: LOINC,
            code: '8462-4',
            display: 'Diastolic blood pressure',
          },
        ],
        text: 'Diastolic blood pressure',
      },
      valueQuantity: {
        value: diastolic,
        unit: 'mmHg',
        system: UCUM,
        code: 'mm[Hg]',
      },
    });
  }

  if (systolic) {
    components.push({
      code: {
        coding: [
          {
            system: LOINC,
            code: '8480-6',
            display: 'Systolic blood pressure',
          },
        ],
        text: 'Systolic blood pressure',
      },
      valueQuantity: {
        value: systolic,
        unit: 'mmHg',
        system: UCUM,
        code: 'mm[Hg]',
      },
    });
  }

  return components;
}

function createAllergy({
  allergy,
  patient,
}: {
  allergy: Coding | undefined;
  patient: Reference<Patient>;
}): AllergyIntolerance | undefined {
  if (!allergy) return undefined;

  const allergyResource: AllergyIntolerance = {
    resourceType: 'AllergyIntolerance',
    clinicalStatus: {
      text: 'Active',
      coding: [
        {
          system: 'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical',
          code: 'active',
          display: 'Active',
        },
      ],
    },
    verificationStatus: {
      text: 'Unconfirmed',
      coding: [
        {
          system: 'http://hl7.org/fhir/ValueSet/allergyintolerance-verification',
          code: 'unconfirmed',
          display: 'Unconfirmed',
        },
      ],
    },
    patient: patient,
    code: { coding: [allergy] },
  };

  return allergyResource;
}
