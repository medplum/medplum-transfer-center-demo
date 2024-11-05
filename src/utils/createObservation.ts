import { createReference } from '@medplum/core';
import {
  Reference,
  Patient,
  QuestionnaireResponse,
  CodeableConcept,
  Observation,
  ObservationComponent,
} from '@medplum/fhirtypes';

/**
 * Creates an Observation resource.
 * @param patient The patient reference.
 * @param response The QuestionnaireResponse that generated the Observation.
 * @param effectiveDateTime The effective date/time of the Observation.
 * @param category The category of the Observation.
 * @param code The code of the Observation.
 * @param valueQuantity The valueQuantity of the Observation.
 * @param valueCodeableConcept The valueCodeableConcept of the Observation.
 * @param component The component of the Observation.
 * @param hasMember The hasMember of the Observation.
 * @param note The note of the Observation.
 * @returns The Observation resource, or undefined if no value nor component nor note is defined.
 */
export function createObservation({
  patient,
  response,
  effectiveDateTime,
  category,
  code,
  valueQuantity,
  valueCodeableConcept,
  component,
  hasMember,
  note,
}: {
  patient: Reference<Patient>;
  response: QuestionnaireResponse;
  effectiveDateTime: string;
  category?: CodeableConcept;
  code: CodeableConcept;
  valueQuantity?: Observation['valueQuantity'];
  valueCodeableConcept?: Observation['valueCodeableConcept'];
  component?: ObservationComponent[];
  note?: string;
  hasMember?: Observation['hasMember'];
}): Observation | undefined {
  if (!valueQuantity && !valueCodeableConcept && !component && !note) return undefined;

  const observation: Observation = {
    resourceType: 'Observation',
    status: 'final',
    subject: patient,
    effectiveDateTime,
    derivedFrom: [createReference(response)],
    code,
    category: category ? [category] : undefined,
    component,
    note: note ? [{ text: note, time: effectiveDateTime }] : undefined,
    hasMember,
  };

  if (valueQuantity) {
    observation.valueQuantity = valueQuantity;
  } else if (valueCodeableConcept) {
    observation.valueCodeableConcept = valueCodeableConcept;
  }

  return observation;
}
