import { createReference, indexSearchParameterBundle, indexStructureDefinitionBundle, resolveId } from '@medplum/core';
import { readJson, SEARCH_PARAMETER_BUNDLE_FILES } from '@medplum/definitions';
import { Bundle, QuestionnaireResponse, SearchParameter, ServiceRequest, Task } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { ACCEPTING_PHYSICIAN_INTAKE_QUESTIONNAIRE_ID, handler } from './accepting-physician-intake-bot';

describe('Accepting Physician Intake Bot', async () => {
  let medplum: MockClient;
  let serviceRequest: ServiceRequest;
  let task: Task;
  const bot = { reference: 'Bot/123' };
  const contentType = 'application/fhir+json';
  const patient = { reference: 'Patient/123' };
  const physician = { reference: 'Practitioner/456' };

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
    serviceRequest = await medplum.createResource({
      resourceType: 'ServiceRequest',
      code: {
        coding: [{ system: 'http://snomed.info/sct', code: '19712007', display: 'Patient transfer (procedure)' }],
        text: 'Patient transfer',
      },
      status: 'active',
      intent: 'proposal',
      subject: patient,
    });
    task = await medplum.createResource({
      resourceType: 'Task',
      status: 'ready',
      priority: 'asap',
      intent: 'plan',
      code: { coding: [{ system: 'http://hl7.org/fhir/CodeSystem/task-code', code: 'fulfill' }] },
      basedOn: [createReference(serviceRequest)],
    });
  });

  it('successfully updates resources', async () => {
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: `Questionnaire/${ACCEPTING_PHYSICIAN_INTAKE_QUESTIONNAIRE_ID}`,
      subject: createReference(serviceRequest),
      item: [
        {
          linkId: 'acceptingSpecialty',
          text: 'Accepting Specialty',
          answer: [
            {
              valueCoding: {
                system: 'http://snomed.info/sct',
                code: '394579002',
                display: 'Cardiology',
              },
            },
          ],
        },
        {
          linkId: 'startingLocation',
          text: 'Starting Location',
          answer: [
            {
              valueCoding: {
                system: 'http://snomed.info/sct',
                code: '225728007',
                display: 'ED',
              },
            },
          ],
        },
        {
          linkId: 'primaryAcceptingPhysician',
          text: 'Primary Accepting Physician',
          answer: [
            {
              valueReference: physician,
            },
          ],
        },
      ],
    };

    await handler(medplum, { bot, input, contentType, secrets: {} });

    // Update the patient transfer service request
    const serviceRequestId = resolveId(serviceRequest) as string;
    const updatedServiceRequest = await medplum.readResource('ServiceRequest', serviceRequestId);
    expect(updatedServiceRequest.performer).toHaveLength(1);
    expect(updatedServiceRequest.performer?.[0]).toEqual(physician);

    // Update the phone call task
    const updatedTask = await medplum.readResource('Task', resolveId(task) as string);
    expect(updatedTask).toBeDefined();
    expect(updatedTask?.owner).toEqual(physician);
  });

  it('throws error on missing service request', async () => {
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: `Questionnaire/${ACCEPTING_PHYSICIAN_INTAKE_QUESTIONNAIRE_ID}`,
      item: [],
    };

    await expect(async () => {
      await handler(medplum, { bot, input, contentType, secrets: {} });
    }).rejects.toThrow('Service request is required');
  });

  it('throws error on missing primary accepting physician', async () => {
    const input: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: `Questionnaire/${ACCEPTING_PHYSICIAN_INTAKE_QUESTIONNAIRE_ID}`,
      subject: createReference(serviceRequest),
      item: [
        {
          linkId: 'acceptingSpecialty',
          text: 'Accepting Specialty',
          answer: [
            {
              valueCoding: {
                system: 'http://snomed.info/sct',
                code: '394579002',
                display: 'Cardiology',
              },
            },
          ],
        },
        {
          linkId: 'startingLocation',
          text: 'Starting Location',
          answer: [
            {
              valueCoding: {
                system: 'http://snomed.info/sct',
                code: '225728007',
                display: 'ED',
              },
            },
          ],
        },
      ],
    };

    await expect(async () => {
      await handler(medplum, { bot, input, contentType, secrets: {} });
    }).rejects.toThrow('Primary accepting physician is required');
  });
});
