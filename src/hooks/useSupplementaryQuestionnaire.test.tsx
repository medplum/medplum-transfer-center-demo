import { act, renderHook } from '@testing-library/react';
import { MockClient } from '@medplum/mock';
import { ServiceRequest, Questionnaire } from '@medplum/fhirtypes';
import { MedplumProvider } from '@medplum/react';
import { MemoryRouter } from 'react-router-dom';
import { useSupplementaryQuestionnaire } from '@/hooks/useSupplementaryQuestionnaire';

// Mocks
let mockServiceRequestWithPerformer: ServiceRequest = {
  resourceType: 'ServiceRequest',
  status: 'active',
  intent: 'proposal',
  subject: { reference: 'Patient/123' },
  performer: [{ reference: 'Practitioner/456' }],
};

let mockServiceRequestWithoutPerformer: ServiceRequest = {
  resourceType: 'ServiceRequest',
  status: 'active',
  intent: 'proposal',
  subject: { reference: 'Patient/123' },
};

let mockPractitionerQuestionnaire: Questionnaire = {
  resourceType: 'Questionnaire',
  title: 'Mock Practitioner Questionnaire',
  status: 'active',
  useContext: [
    {
      code: {
        system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
        code: 'user',
        display: 'user',
      },
      valueCodeableConcept: {
        coding: [
          {
            system: 'https://haysmed.com/fhir/CodeSystem/practitioner-id',
            code: '456',
            display: 'Dr. Smith',
          },
        ],
      },
    },
  ],
};

describe('useSupplementaryQuestionnaire', () => {
  let medplum: MockClient;

  beforeEach(async () => {
    medplum = new MockClient();
    mockServiceRequestWithPerformer = await medplum.createResource(mockServiceRequestWithPerformer);
    mockServiceRequestWithoutPerformer = await medplum.createResource(mockServiceRequestWithoutPerformer);
    mockPractitionerQuestionnaire = await medplum.createResource(mockPractitionerQuestionnaire);
  });

  function wrapper({ children }: { children?: React.ReactNode }) {
    return (
      <MedplumProvider medplum={medplum}>
        <MemoryRouter>{children}</MemoryRouter>
      </MedplumProvider>
    );
  }

  describe('getDisplay', () => {
    it('returns correct display for practitioner type with performer', () => {
      const { result } = renderHook(
        () => useSupplementaryQuestionnaire(mockServiceRequestWithPerformer, 'practitioner'),
        { wrapper }
      );

      expect(result.current.getDisplay()).toBe('Physician Supplementary Intake Questionnaire');
    });

    it('returns correct display for acceptingPhysician type', () => {
      const { result } = renderHook(
        () => useSupplementaryQuestionnaire(mockServiceRequestWithoutPerformer, 'acceptingPhysician'),
        { wrapper }
      );

      expect(result.current.getDisplay()).toBe('Accepting Physician Supplementary Intake Questionnaire');
    });

    it('returns undefined for practitioner type without performer', () => {
      const { result } = renderHook(
        () => useSupplementaryQuestionnaire(mockServiceRequestWithoutPerformer, 'practitioner'),
        { wrapper }
      );

      expect(result.current.getDisplay()).toBeUndefined();
    });
  });

  describe('fetchQuestionnaire', () => {
    it('fetches questionnaire for practitioner type with performer', async () => {
      const { result } = renderHook(
        () => useSupplementaryQuestionnaire(mockServiceRequestWithPerformer, 'practitioner'),
        { wrapper }
      );

      await act(async () => {
        const questionnaire = await result.current.fetchQuestionnaire();
        expect(questionnaire).toEqual(mockPractitionerQuestionnaire);
      });
    });

    it('fetches questionnaire for acceptingPhysician type', async () => {
      // This is being mocked because it is queried by id
      const mockAcceptingPhysicianQuestionnaire: Questionnaire = await medplum.createResource({
        resourceType: 'Questionnaire',
        title: 'Mock Accepting Physician Questionnaire',
        status: 'active',
      });
      medplum.searchOne = vi.fn().mockResolvedValue(mockAcceptingPhysicianQuestionnaire);

      const { result } = renderHook(
        () => useSupplementaryQuestionnaire(mockServiceRequestWithoutPerformer, 'acceptingPhysician'),
        { wrapper }
      );

      await act(async () => {
        const questionnaire = await result.current.fetchQuestionnaire();
        expect(questionnaire).toEqual(mockAcceptingPhysicianQuestionnaire);
      });
    });

    it('returns undefined for practitioner type without performer', async () => {
      const { result } = renderHook(
        () => useSupplementaryQuestionnaire(mockServiceRequestWithoutPerformer, 'practitioner'),
        { wrapper }
      );

      await act(async () => {
        const questionnaire = await result.current.fetchQuestionnaire();
        expect(questionnaire).toBeUndefined();
      });
    });

    it('returns undefined for practitioner without questionnaire', async () => {
      const mockServiceRequestWithPerformer2: ServiceRequest = await medplum.createResource({
        ...mockServiceRequestWithPerformer,
        performer: [{ reference: 'Practitioner/222' }],
      });

      const { result } = renderHook(
        () => useSupplementaryQuestionnaire(mockServiceRequestWithPerformer2, 'practitioner'),
        { wrapper }
      );

      await act(async () => {
        const questionnaire = await result.current.fetchQuestionnaire();
        expect(questionnaire).toBeUndefined();
      });
    });
  });

  describe('isAcceptingResponse', () => {
    it('returns true when questionnaire exists and is not in supportingInfo', async () => {
      const { result } = renderHook(
        () => useSupplementaryQuestionnaire(mockServiceRequestWithPerformer, 'practitioner'),
        { wrapper }
      );

      await act(async () => {
        const isAccepting = await result.current.isAcceptingResponse();
        expect(isAccepting).toBe(true);
      });
    });

    it('returns false when questionnaire exists but is in supportingInfo', async () => {
      const serviceRequestWithSupportingInfo: ServiceRequest = await medplum.createResource({
        ...mockServiceRequestWithPerformer,
        supportingInfo: [{ display: 'Physician Supplementary Intake Questionnaire' }],
      });

      const { result } = renderHook(
        () => useSupplementaryQuestionnaire(serviceRequestWithSupportingInfo, 'practitioner'),
        { wrapper }
      );

      await act(async () => {
        const isAccepting = await result.current.isAcceptingResponse();
        expect(isAccepting).toBe(false);
      });
    });

    it('returns false when questionnaire does not exist', async () => {
      const { result } = renderHook(
        () => useSupplementaryQuestionnaire(mockServiceRequestWithoutPerformer, 'acceptingPhysician'),
        { wrapper }
      );

      await act(async () => {
        const isAccepting = await result.current.isAcceptingResponse();
        expect(isAccepting).toBe(false);
      });
    });
  });
});
