import { generateId, getReferenceString, ICD10, LOINC, SNOMED, UCUM } from '@medplum/core';
import { Patient, Questionnaire, QuestionnaireResponse, QuestionnaireResponseItem } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { PATIENT_INTAKE_QUESTIONNAIRE_NAME } from '@/lib/common';
import { handler } from './patient-intake-bot';

describe('Patient Intake Bot', async () => {
  let medplum: MockClient;
  let questionnaire: Questionnaire;
  const bot = { reference: 'Bot/123' };
  const contentType = 'application/fhir+json';
  const requiredAnswerItems = [
    {
      linkId: 'dateTime',
      answer: [{ valueDateTime: '2024-10-23T14:30:00Z' }],
    },
    {
      linkId: 'firstName',
      answer: [{ valueString: 'Marge' }],
    },
    {
      linkId: 'lastName',
      answer: [{ valueString: 'Simpson' }],
    },
    {
      linkId: 'birthdate',
      answer: [{ valueDate: '1958-03-19' }],
    },
    {
      linkId: 'transferInfo',
      item: [
        {
          linkId: 'transferFacility',
          answer: [
            {
              valueReference: {
                reference: 'Organization/222',
                display: 'Acme Hospital',
              },
            },
          ],
        },
        {
          linkId: 'transferPhys',
          item: [
            {
              linkId: 'transferPhysFirst',
              answer: [{ valueString: 'Marie' }],
            },
            {
              linkId: 'transferPhysLast',
              answer: [{ valueString: 'Anne' }],
            },
            {
              linkId: 'transferPhysPhone',
              answer: [{ valueString: '111-222-4444' }],
            },
          ],
        },
      ],
    },
    {
      linkId: 'requisitionId',
      answer: [{ valueString: generateId() }],
    },
  ];

  beforeEach(async () => {
    medplum = new MockClient();
    questionnaire = await medplum.createResource({
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Patient Transfer Form',
      name: PATIENT_INTAKE_QUESTIONNAIRE_NAME,
    });
  });

  function createInput(items: QuestionnaireResponseItem[]): QuestionnaireResponse {
    return {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: getReferenceString(questionnaire),
      item: [...requiredAnswerItems, ...items],
    };
  }

  it('successfully creates resources', async () => {
    const input: QuestionnaireResponse = createInput([
      {
        linkId: 'phone',
        answer: [{ valueString: '123-456-7890' }],
      },
      {
        linkId: 'street',
        answer: [{ valueString: '123 Main St' }],
      },
      {
        linkId: 'city',
        answer: [{ valueString: 'Sunnyvale' }],
      },
      {
        linkId: 'state',
        answer: [{ valueCoding: { system: 'http://hl7.org/fhir/us/core/ValueSet/us-core-usps-state', code: 'CA' } }],
      },
      {
        linkId: 'postalCode',
        answer: [{ valueString: '95008' }],
      },
      {
        linkId: 'chiefComplaint',
        answer: [
          {
            valueCoding: {
              system: ICD10,
              code: 'I50',
              display: 'Heart failure',
            },
          },
        ],
      },
      {
        linkId: 'vitalSigns',
        item: [
          {
            linkId: 'bloodPressureSystolic',
            answer: [{ valueInteger: 120 }],
          },
          {
            linkId: 'bloodPressureDiastolic',
            answer: [{ valueInteger: 80 }],
          },
          {
            linkId: 'temperature',
            answer: [{ valueDecimal: 98.6 }],
          },
          {
            linkId: 'heartRate',
            answer: [{ valueInteger: 72 }],
          },
          {
            linkId: 'respiratoryRate',
            answer: [{ valueDecimal: 12 }],
          },
          {
            linkId: 'oxygenSaturation',
            answer: [{ valueDecimal: 98 }],
          },
          {
            linkId: 'height',
            answer: [{ valueDecimal: 65 }],
          },
          {
            linkId: 'weight',
            answer: [{ valueDecimal: 133 }],
          },
        ],
      },
      {
        linkId: 'allergies',
        item: [
          {
            linkId: 'allergySubstance',
            answer: [
              {
                valueCoding: {
                  system: SNOMED,
                  code: '111088007',
                  display: 'Latex (substance)',
                },
              },
            ],
          },
        ],
      },
      {
        linkId: 'allergies',
        item: [
          {
            linkId: 'allergySubstance',
            answer: [
              {
                valueCoding: {
                  system: SNOMED,
                  code: '256259004',
                  display: 'Pollen (substance)',
                },
              },
            ],
          },
        ],
      },
    ]);

    await handler(medplum, { bot, input, contentType, secrets: {} });

    // Patient
    const patient = (await medplum.searchOne('Patient', 'name=Marge')) as Patient;
    expect(patient).toBeDefined();
    expect(patient.name).toEqual([{ family: 'Simpson', given: ['Marge'] }]);
    expect(patient.birthDate).toEqual('1958-03-19');
    expect(patient.telecom).toEqual([{ system: 'phone', value: '123-456-7890' }]);
    expect(patient.address).toEqual([
      {
        use: 'home',
        type: 'physical',
        line: ['123 Main St'],
        city: 'Sunnyvale',
        state: 'CA',
        postalCode: '95008',
      },
    ]);

    // Chief Complaint
    const chiefComplaintObservation = await medplum.searchResources('Observation', {
      subject: getReferenceString(patient),
      code: `${LOINC}|46239-0`,
    });
    expect(chiefComplaintObservation).toHaveLength(1);
    expect(chiefComplaintObservation[0].valueCodeableConcept).toEqual({
      coding: [
        {
          system: ICD10,
          code: 'I50',
          display: 'Heart failure',
        },
      ],
    });

    // Vital Signs
    const bloodPressureObservation = await medplum.searchResources('Observation', {
      subject: getReferenceString(patient),
      code: `${LOINC}|85354-9`,
    });
    expect(bloodPressureObservation).toHaveLength(1);
    expect(bloodPressureObservation[0].component).toHaveLength(2);
    expect(bloodPressureObservation[0].component?.[0].code.coding?.[0].code).toEqual('8462-4');
    expect(bloodPressureObservation[0].component?.[0].valueQuantity).toEqual({
      value: 80,
      unit: 'mmHg',
      system: UCUM,
      code: 'mm[Hg]',
    });
    expect(bloodPressureObservation[0].component?.[1].code.coding?.[0].code).toEqual('8480-6');
    expect(bloodPressureObservation[0].component?.[1].valueQuantity).toEqual({
      value: 120,
      unit: 'mmHg',
      system: UCUM,
      code: 'mm[Hg]',
    });

    const temperatureObservation = await medplum.searchResources('Observation', {
      subject: getReferenceString(patient),
      code: `${LOINC}|8310-5`,
    });
    expect(temperatureObservation).toHaveLength(1);
    expect(temperatureObservation[0].valueQuantity).toEqual({
      value: 98.6,
      unit: 'F',
      system: UCUM,
      code: '[degF]',
    });

    const heartRateObservation = await medplum.searchResources('Observation', {
      subject: getReferenceString(patient),
      code: `${LOINC}|8867-4`,
    });
    expect(heartRateObservation).toHaveLength(1);
    expect(heartRateObservation[0].valueQuantity).toEqual({
      value: 72,
      unit: 'beats/min',
      system: UCUM,
      code: '/min',
    });

    const respiratoryRateObservation = await medplum.searchResources('Observation', {
      subject: getReferenceString(patient),
      code: `${LOINC}|9279-1`,
    });
    expect(respiratoryRateObservation).toHaveLength(1);
    expect(respiratoryRateObservation[0].valueQuantity).toEqual({
      value: 12,
      unit: 'breaths/min',
      system: UCUM,
      code: '/min',
    });

    const oxygenSaturationObservation = await medplum.searchResources('Observation', {
      subject: getReferenceString(patient),
      code: `${LOINC}|59408-5`,
    });
    expect(oxygenSaturationObservation).toHaveLength(1);
    expect(oxygenSaturationObservation[0].valueQuantity).toEqual({
      value: 98,
      unit: '%O2',
      system: UCUM,
      code: '%',
    });

    const heightObservation = await medplum.searchResources('Observation', {
      subject: getReferenceString(patient),
      code: `${LOINC}|8302-2`,
    });
    expect(heightObservation).toHaveLength(1);
    expect(heightObservation[0].valueQuantity).toEqual({
      value: 65,
      unit: 'in_i',
      system: UCUM,
      code: '[in_i]',
    });

    const weightObservation = await medplum.searchResources('Observation', {
      subject: getReferenceString(patient),
      code: `${LOINC}|29463-7`,
    });
    expect(weightObservation).toHaveLength(1);
    expect(weightObservation[0].valueQuantity).toEqual({
      value: 133,
      unit: 'lb_av',
      system: UCUM,
      code: '[lb_av]',
    });

    // Allergies
    const allergies = await medplum.searchResources('AllergyIntolerance', {
      patient: getReferenceString(patient),
    });
    expect(allergies).toHaveLength(2);
    expect(allergies[0].code?.coding).toEqual([
      {
        system: SNOMED,
        code: '111088007',
        display: 'Latex (substance)',
      },
    ]);
    expect(allergies[1].code?.coding).toEqual([
      {
        system: SNOMED,
        code: '256259004',
        display: 'Pollen (substance)',
      },
    ]);
  });

  it('throws error on missing questionnaire', async () => {
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
    };

    await expect(async () => {
      await handler(medplum, { bot, input, contentType, secrets: {} });
    }).rejects.toThrow('Questionnaire is required');
  });

  it('throws error on invalid questionnaire', async () => {
    const otherQuestionnaire = await medplum.createResource({
      resourceType: 'Questionnaire',
      title: 'Other Questionnaire',
      status: 'active',
    });
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: getReferenceString(otherQuestionnaire),
    };

    await expect(async () => {
      await handler(medplum, { bot, input, contentType, secrets: {} });
    }).rejects.toThrow('Invalid questionnaire');
  });

  it('throws error on missing dateTime', async () => {
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: getReferenceString(questionnaire),
      item: requiredAnswerItems.filter((item) => item.linkId !== 'dateTime'),
    };

    await expect(async () => {
      await handler(medplum, { bot, input, contentType, secrets: {} });
    }).rejects.toThrow('Missing required Date/Time');
  });

  it('throws error on missing patient name', async () => {
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: getReferenceString(questionnaire),
      item: requiredAnswerItems.filter((item) => item.linkId !== 'firstName' && item.linkId !== 'lastName'),
    };

    await expect(async () => {
      await handler(medplum, { bot, input, contentType, secrets: {} });
    }).rejects.toThrow('Missing required Patient Name');
  });

  it('throws error on missing patient birthdate', async () => {
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: getReferenceString(questionnaire),
      item: requiredAnswerItems.filter((item) => item.linkId !== 'birthdate'),
    };

    await expect(async () => {
      await handler(medplum, { bot, input, contentType, secrets: {} });
    }).rejects.toThrow('Missing required Patient Birthdate');
  });
});
