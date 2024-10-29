import { MockClient } from '@medplum/mock';
import { handler } from './patient-intake-bot';
import { Questionnaire, QuestionnaireResponse } from '@medplum/fhirtypes';
import { generateId, getReferenceString } from '@medplum/core';
import { PATIENT_INTAKE_QUESTIONNAIRE_NAME } from '@/lib/common';

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
      linkId: 'transferPhysPhone',
      answer: [{ valueString: '111-222-4444' }],
    },
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
      item: [
        {
          id: 'id-12',
          linkId: 'dateTime',
          type: 'dateTime',
          text: 'Date/Time',
        },
        {
          id: 'id-25',
          linkId: 'patientInfo',
          type: 'group',
          text: 'Patient Info',
          item: [
            {
              id: 'id-2',
              linkId: 'firstName',
              type: 'string',
              text: 'First Name',
            },
            {
              id: 'id-3',
              linkId: 'lastName',
              type: 'string',
              text: 'Last Name',
            },
            {
              id: 'id-4',
              linkId: 'birthdate',
              type: 'date',
              text: 'Birthdate',
            },
            {
              id: 'id-29',
              linkId: 'phone',
              type: 'string',
              text: 'Phone Number',
            },
            {
              id: 'id-49',
              linkId: 'street',
              text: 'Street',
              type: 'string',
            },
            {
              id: 'id-50',
              linkId: 'city',
              text: 'City',
              type: 'string',
            },
            {
              id: 'id-51',
              linkId: 'state',
              text: 'State',
              type: 'choice',
              answerValueSet: 'http://hl7.org/fhir/us/core/ValueSet/us-core-usps-state',
            },
            {
              id: 'id-52',
              linkId: 'postalCode',
              text: 'Postal Code',
              type: 'string',
            },
            {
              id: 'id-30',
              linkId: 'vitalSigns',
              type: 'string',
              text: 'Vital Signs',
            },
            {
              id: 'id-31',
              linkId: 'height',
              type: 'string',
              text: 'Height',
            },
            {
              id: 'id-32',
              linkId: 'weight',
              type: 'string',
              text: 'Weight',
            },
            {
              id: 'id-28',
              linkId: 'chiefComplaint',
              type: 'choice',
              text: 'Chief Complaint',
              answerValueSet: 'https://haysmed.com/fhir/ValueSet/chief-complaint',
            },
            {
              id: 'id-33',
              linkId: 'g5',
              type: 'group',
              text: 'Allergy',
              item: [
                {
                  id: 'id-35',
                  linkId: 'allergySubstance',
                  type: 'choice',
                  text: 'Substance',
                  answerValueSet: 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1186.8',
                },
              ],
              repeats: true,
            },
          ],
        },
        {
          id: 'id-37',
          linkId: 'g9',
          type: 'group',
          text: 'Lab',
          item: [
            {
              id: 'id-38',
              linkId: 'na+',
              type: 'string',
              text: 'Na+',
            },
            {
              id: 'id-39',
              linkId: 'k+',
              type: 'string',
              text: 'K+',
            },
            {
              id: 'id-40',
              linkId: 'ci-',
              type: 'string',
              text: 'CI-',
            },
            {
              id: 'id-41',
              linkId: 'hco3',
              type: 'string',
              text: 'HCO3',
            },
            {
              id: 'id-42',
              linkId: 'bun',
              type: 'string',
              text: 'BUN',
            },
            {
              id: 'id-43',
              linkId: 'cr',
              type: 'string',
              text: 'Cr',
            },
            {
              id: 'id-44',
              linkId: 'glucose',
              type: 'string',
              text: 'Glucose',
            },
            {
              id: 'id-45',
              linkId: 'wbc',
              type: 'string',
              text: 'WBC',
            },
            {
              id: 'id-46',
              linkId: 'hb',
              type: 'string',
              text: 'Hb',
            },
            {
              id: 'id-47',
              linkId: 'hct',
              type: 'string',
              text: 'HCT',
            },
            {
              id: 'id-48',
              linkId: 'plts',
              type: 'string',
              text: 'Plts',
            },
          ],
        },
        {
          id: 'id-26',
          linkId: 'transferInfo',
          text: 'Transfer Info',
          type: 'group',
          item: [
            {
              id: 'id-9',
              linkId: 'transferFacility',
              type: 'reference',
              text: 'Transferring Facility',
              extension: [
                {
                  url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource',
                  valueCode: 'Organization',
                },
              ],
            },
            {
              id: 'id-17',
              linkId: 'transferOrigin',
              type: 'choice',
              text: 'Transferring Origin',
              answerValueSet: 'https://www.haysmed.com/ValueSet/transferring-origins',
            },
            {
              id: 'id-19',
              linkId: 'transferPhys',
              type: 'group',
              text: 'Transferring Physician',
              item: [
                {
                  id: 'id-20',
                  linkId: 'transferPhysFirst',
                  type: 'string',
                  text: 'First Name',
                },
                {
                  id: 'id-21',
                  linkId: 'transferPhysLast',
                  type: 'string',
                  text: 'Last Name',
                },
                {
                  id: 'id-22',
                  linkId: 'transferPhysQual',
                  type: 'string',
                  text: 'Qualifications [Title(s)]',
                },
                {
                  id: 'id-24',
                  linkId: 'transferPhysPhone',
                  type: 'string',
                  text: 'Phone Number',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('successfully creates resources', async () => {
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: getReferenceString(questionnaire),
      item: [
        ...requiredAnswerItems,
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
      ],
    };

    await handler(medplum, { bot, input, contentType, secrets: {} });

    const patient = await medplum.searchOne('Patient', 'name=Marge');
    expect(patient).toBeDefined();
    expect(patient?.name).toEqual([{ family: 'Simpson', given: ['Marge'] }]);
    expect(patient?.birthDate).toEqual('1958-03-19');
    expect(patient?.telecom).toEqual([{ system: 'phone', value: '123-456-7890' }]);
    expect(patient?.address).toEqual([
      {
        use: 'home',
        type: 'physical',
        line: ['123 Main St'],
        city: 'Sunnyvale',
        state: 'CA',
        postalCode: '95008',
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
    }).rejects.toThrow('Required dateTime not specified');
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
    }).rejects.toThrow('Missing patient name');
  });

  it('throws error on missing patient birthdate', async () => {
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: getReferenceString(questionnaire),
      item: [
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
      ],
    };

    await expect(async () => {
      await handler(medplum, { bot, input, contentType, secrets: {} });
    }).rejects.toThrow('Missing patient birthdate');
  });
});
