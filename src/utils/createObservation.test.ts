import { CodeableConcept, Observation, Patient, QuestionnaireResponse, Reference } from '@medplum/fhirtypes';
import { createObservation } from './createObservation';
import { createReference, SNOMED, UCUM } from '@medplum/core';

describe('createObservation', () => {
  const patient: Reference<Patient> = { reference: 'Patient/123' };
  const response: QuestionnaireResponse = { resourceType: 'QuestionnaireResponse', status: 'completed' };
  const effectiveDateTime = '2024-01-01T00:00:00Z';
  const code: CodeableConcept = { coding: [{ system: 'http://loinc.org', code: '12345-6' }] };

  it('returns undefined if no value nor component nor note is defined', () => {
    const observation = createObservation({ patient, response, effectiveDateTime, code });

    expect(observation).toBeUndefined();
  });

  it('returns an Observation with category', () => {
    const category: CodeableConcept = {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs',
        },
      ],
    };
    const valueQuantity: Observation['valueQuantity'] = { value: 98.6, unit: 'F', system: UCUM, code: '[degF]' };

    const observation = createObservation({ patient, response, effectiveDateTime, category, code, valueQuantity });

    expect(observation).toEqual({
      resourceType: 'Observation',
      status: 'final',
      subject: patient,
      effectiveDateTime,
      derivedFrom: [createReference(response)],
      code,
      category: [category],
      valueQuantity,
    });
  });

  it('returns an Observation with valueQuantity', () => {
    const valueQuantity: Observation['valueQuantity'] = { value: 98.6, unit: 'F', system: UCUM, code: '[degF]' };

    const observation = createObservation({ patient, response, effectiveDateTime, code, valueQuantity });

    expect(observation).toEqual({
      resourceType: 'Observation',
      status: 'final',
      subject: patient,
      effectiveDateTime,
      derivedFrom: [createReference(response)],
      code,
      valueQuantity,
    });
  });

  it('returns an Observation with valueCodeableConcept', () => {
    const valueCodeableConcept: Observation['valueCodeableConcept'] = { coding: [{ system: SNOMED, code: '123456' }] };

    const observation = createObservation({ patient, response, effectiveDateTime, code, valueCodeableConcept });

    expect(observation).toEqual({
      resourceType: 'Observation',
      status: 'final',
      subject: patient,
      effectiveDateTime,
      derivedFrom: [createReference(response)],
      code,
      valueCodeableConcept,
    });
  });

  it('returns an Observation with component', () => {
    const component: Observation['component'] = [
      {
        code: { coding: [{ system: SNOMED, code: '23456-7' }] },
        valueQuantity: { value: 98.6, unit: 'F', system: UCUM, code: '[degF]' },
      },
    ];

    const observation = createObservation({ patient, response, effectiveDateTime, code, component });

    expect(observation).toEqual({
      resourceType: 'Observation',
      status: 'final',
      subject: patient,
      effectiveDateTime,
      derivedFrom: [createReference(response)],
      code,
      component,
    });
  });

  it('returns an Observation with note', () => {
    const note = 'This is a note';

    const observation = createObservation({ patient, response, effectiveDateTime, code, note });

    expect(observation).toEqual({
      resourceType: 'Observation',
      status: 'final',
      subject: patient,
      effectiveDateTime,
      derivedFrom: [createReference(response)],
      code,
      note: [{ text: note, time: effectiveDateTime }],
    });
  });

  it('returns an Observation with hasMember', () => {
    const valueQuantity: Observation['valueQuantity'] = { value: 98.6, unit: 'F', system: UCUM, code: '[degF]' };
    const hasMember: Observation['hasMember'] = [{ reference: 'Observation/456' }];

    const observation = createObservation({ patient, response, effectiveDateTime, code, valueQuantity, hasMember });

    expect(observation).toEqual({
      resourceType: 'Observation',
      status: 'final',
      subject: patient,
      effectiveDateTime,
      derivedFrom: [createReference(response)],
      code,
      valueQuantity,
      hasMember,
    });
  });

  it('returns an Observation with all fields', () => {
    const category: CodeableConcept = {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs',
        },
      ],
    };
    const valueQuantity: Observation['valueQuantity'] = { value: 98.6, unit: 'F', system: UCUM, code: '[degF]' };
    const component: Observation['component'] = [
      {
        code: { coding: [{ system: SNOMED, code: '23456-7' }] },
        valueQuantity: { value: 98.6, unit: 'F', system: UCUM, code: '[degF]' },
      },
    ];
    const note = 'This is a note';
    const hasMember: Observation['hasMember'] = [{ reference: 'Observation/456' }];

    const observation = createObservation({
      patient,
      response,
      effectiveDateTime,
      category,
      code,
      valueQuantity,
      component,
      note,
      hasMember,
    });

    expect(observation).toEqual({
      resourceType: 'Observation',
      status: 'final',
      subject: patient,
      effectiveDateTime,
      derivedFrom: [createReference(response)],
      code,
      category: [category],
      valueQuantity,
      component,
      note: [{ text: note, time: effectiveDateTime }],
      hasMember,
    });
  });
});
