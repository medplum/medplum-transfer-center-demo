import { createReference, indexSearchParameterBundle, indexStructureDefinitionBundle } from '@medplum/core';
import { readJson, SEARCH_PARAMETER_BUNDLE_FILES } from '@medplum/definitions';
import { Bundle, QuestionnaireResponse, SearchParameter } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { handler } from './location-lvl-bot';

const HAYS_MED_ORG_ID = '6cd37206-891f-4783-8b31-e6fed9f70ebd';
const CREATE_LOCATION_LVL_QUESTIONNAIRE_ID = 'cd78cab0-d3b4-4b33-9df2-60289ac3ca8b';

describe('Location Lvl Bot', async () => {
  let medplum: MockClient;
  const bot = { reference: 'Bot/123' };
  const contentType = 'application/fhir+json';

  beforeAll(() => {
    indexStructureDefinitionBundle(readJson('fhir/r4/profiles-types.json') as Bundle);
    indexStructureDefinitionBundle(readJson('fhir/r4/profiles-resources.json') as Bundle);
    indexStructureDefinitionBundle(readJson('fhir/r4/profiles-medplum.json') as Bundle);
    for (const filename of SEARCH_PARAMETER_BUNDLE_FILES) {
      indexSearchParameterBundle(readJson(filename) as Bundle<SearchParameter>);
    }
  });

  beforeEach(async () => {
    medplum = new MockClient();
  });

  it('successfully creates a level location', async () => {
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: `Questionnaire/${CREATE_LOCATION_LVL_QUESTIONNAIRE_ID}`,
      item: [
        {
          id: 'id-1',
          linkId: 'name',
          text: 'Name',
          answer: [
            {
              valueString: 'Level 1',
            },
          ],
        },
        {
          id: 'id-2',
          linkId: 'status',
          text: 'Status',
          answer: [
            {
              valueCoding: {
                system: 'http://hl7.org/fhir/location-status',
                code: 'active',
                display: 'Active',
              },
            },
          ],
        },
        {
          id: 'id-3',
          linkId: 'telecomPhone',
          text: 'Phone',
          answer: [
            {
              valueString: '555-555-5555',
            },
          ],
        },
      ],
    };

    await handler(medplum, { bot, input, contentType, secrets: {} });

    const location = await medplum.searchOne('Location', 'name=Level 1');

    expect(location).toBeDefined();
    expect(location?.partOf).toEqual(createReference({ resourceType: 'Location', id: HAYS_MED_ORG_ID }));
    expect(location?.physicalType?.coding?.[0].code).toEqual('lvl');
    expect(location?.name).toEqual('Level 1');
    expect(location?.status).toEqual('active');
    expect(location?.telecom?.[0]).toEqual({
      system: 'phone',
      value: '555-555-5555',
    });
  });

  it('throws error on missing name', async () => {
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: `Questionnaire/${CREATE_LOCATION_LVL_QUESTIONNAIRE_ID}`,
      item: [
        {
          id: 'id-2',
          linkId: 'status',
          text: 'Status',
          answer: [
            {
              valueCoding: {
                system: 'http://hl7.org/fhir/location-status',
                code: 'active',
                display: 'Active',
              },
            },
          ],
        },
        {
          id: 'id-3',
          linkId: 'telecomPhone',
          text: 'Phone',
          answer: [
            {
              valueString: '555-555-5555',
            },
          ],
        },
      ],
    };

    await expect(handler(medplum, { bot, input, contentType, secrets: {} })).rejects.toThrow('Missing name');
  });

  it('throws error on missing status', async () => {
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: `Questionnaire/${CREATE_LOCATION_LVL_QUESTIONNAIRE_ID}`,
      item: [
        {
          id: 'id-1',
          linkId: 'name',
          text: 'Name',
          answer: [
            {
              valueString: 'Level 1',
            },
          ],
        },
        {
          id: 'id-3',
          linkId: 'telecomPhone',
          text: 'Phone',
          answer: [
            {
              valueString: '555-555-5555',
            },
          ],
        },
      ],
    };

    await expect(handler(medplum, { bot, input, contentType, secrets: {} })).rejects.toThrow('Missing status');
  });
});
