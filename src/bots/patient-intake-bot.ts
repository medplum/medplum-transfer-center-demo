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
  Bundle,
  BundleEntry,
  CodeableConcept,
  CommunicationRequest,
  Observation,
  Organization,
  Patient,
  Practitioner,
  QuestionnaireResponse,
  Reference,
  ServiceRequest,
  Task,
} from '@medplum/fhirtypes';
import {
  createAllergy,
  createBloodPressureObservationComponent,
  createEntry,
  createEntryReference,
  createObservation,
} from '@/utils';
import { HAYS_MED_REQUISITION_SYSTEM, PATIENT_INTAKE_QUESTIONNAIRE_NAME } from '@/lib/common';

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
  respiratoryRate: { coding: [{ system: LOINC, code: '9279-1', display: 'Respiratory rate' }] },
  timeSensitiveDiagnosis: { coding: [{ system: LOINC, code: '78026-2', display: 'Time sensitive diagnosis' }] }, // Diagnosis present on admission
  vitalSignsPanel: { coding: [{ system: LOINC, code: '85353-1', display: 'Vital signs panel' }] },
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
    const patientReference = createEntryReference(patientEntry) as Reference<Patient>;

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
    const heartRateObservationEntry = heartRateObservation ? createEntry(heartRateObservation) : undefined;
    if (heartRateObservationEntry) entries.push(heartRateObservationEntry);

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
    const bloodPressureObservationEntry = bloodPressureObservation ? createEntry(bloodPressureObservation) : undefined;
    if (bloodPressureObservationEntry) entries.push(bloodPressureObservationEntry);

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
    const temperatureObservationEntry = temperatureObservation ? createEntry(temperatureObservation) : undefined;
    if (temperatureObservationEntry) entries.push(temperatureObservationEntry);

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
    const respiratoryRateObservationEntry = respiratoryRateObservation
      ? createEntry(respiratoryRateObservation)
      : undefined;
    if (respiratoryRateObservationEntry) entries.push(respiratoryRateObservationEntry);

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
    const oxygenSaturationObservationEntry = oxygenSaturationObservation
      ? createEntry(oxygenSaturationObservation)
      : undefined;
    if (oxygenSaturationObservationEntry) entries.push(oxygenSaturationObservationEntry);

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
    const heightObservationEntry = heightObservation ? createEntry(heightObservation) : undefined;
    if (heightObservationEntry) entries.push(heightObservationEntry);

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
    const weightObservationEntry = weightObservation ? createEntry(weightObservation) : undefined;
    if (weightObservationEntry) entries.push(weightObservationEntry);

    // Create a panel observation for all vital signs if comments or other observations are present
    const vitalSignsComments = answers['vitalSignsComments']?.valueString;
    const vitalSignsHasMember = [
      heartRateObservationEntry,
      bloodPressureObservationEntry,
      temperatureObservationEntry,
      respiratoryRateObservationEntry,
      oxygenSaturationObservationEntry,
      heightObservationEntry,
      weightObservationEntry,
    ]
      .filter((observationEntry) => observationEntry !== undefined)
      .map((observationEntry) => createEntryReference(observationEntry));

    if (vitalSignsComments || vitalSignsHasMember) {
      const vitalSignsPanelObservation = createObservation({
        patient: patientReference,
        response: input,
        effectiveDateTime,
        code: OBSERVATIONS_CODE_MAP.vitalSignsPanel,
        valueCodeableConcept: { text: vitalSignsComments },
        hasMember: vitalSignsHasMember as Reference<Observation>[],
        note: vitalSignsComments,
      });
      if (vitalSignsPanelObservation) entries.push(createEntry(vitalSignsPanelObservation));
    }

    // Allergies
    const allergyAnswers = getAllQuestionnaireAnswers(input)['allergySubstance'] || [];
    for (const allergyAnswer of allergyAnswers) {
      const allergy = createAllergy({ allergy: allergyAnswer.valueCoding, patient: patientReference });
      if (allergy) entries.push(createEntry(allergy));
    }

    // Diagnosis
    const timeSensitiveDiagnosis = answers['timeSensitiveDiagnosis']?.valueCoding;
    if (timeSensitiveDiagnosis) {
      const diagnosisObservation = createObservation({
        patient: patientReference,
        response: input,
        effectiveDateTime,
        code: OBSERVATIONS_CODE_MAP.timeSensitiveDiagnosis,
        valueCodeableConcept: { coding: [timeSensitiveDiagnosis] },
      });
      if (diagnosisObservation) entries.push(createEntry(diagnosisObservation));
    }

    const chiefComplaint = answers['chiefComplaint']?.valueCoding;
    const chiefComplaintComments = answers['chiefComplaintComments']?.valueString;
    if (chiefComplaint || chiefComplaintComments) {
      const chiefComplaintObservation = createObservation({
        patient: patientReference,
        response: input,
        effectiveDateTime,
        code: OBSERVATIONS_CODE_MAP.chiefComplaint,
        valueCodeableConcept: chiefComplaint ? { coding: [chiefComplaint] } : undefined,
        note: chiefComplaintComments,
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
    const transferringPhysicianReference = createEntryReference(transferringPhysicianEntry) as Reference<Practitioner>;
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
    const serviceRequestReference = createEntryReference(serviceRequestEntry) as Reference<ServiceRequest>;
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
    const communicationRequestReference = createEntryReference(
      communicationRequestEntry
    ) as Reference<CommunicationRequest>;
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
}
