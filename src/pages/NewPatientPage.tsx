import { Container } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { generateId, sleep } from '@medplum/core';
import { QuestionnaireResponse, QuestionnaireResponseItem, ServiceRequest } from '@medplum/fhirtypes';
import { QuestionnaireForm, useMedplum, useMedplumNavigate } from '@medplum/react';
import { useCallback } from 'react';
import { HAYS_MED_REQUISITION_SYSTEM } from '@/lib/common';

const MAX_SEARCH_RETRIES = 3;

export function NewPatientPage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useMedplumNavigate();

  const handleSubmit = useCallback(
    (response: QuestionnaireResponse) => {
      const requisitionId = generateId();
      // We copy the response so it doesn't have a chance of modifying the response in place
      const responseCopy = { ...response };
      (responseCopy.item as QuestionnaireResponseItem[]).push({
        linkId: 'requisitionId',
        text: 'Requisition ID',
        answer: [{ valueString: requisitionId }],
      });
      medplum
        .createResource(responseCopy)
        .then(async () => {
          let serviceRequest: ServiceRequest | undefined;
          let retries = 0;
          let lastErr: Error | undefined;
          let sleepTime = 1000;

          while (retries <= MAX_SEARCH_RETRIES && !serviceRequest) {
            await sleep(sleepTime);
            try {
              serviceRequest = await medplum.searchOne(
                'ServiceRequest',
                {
                  requisition: `${HAYS_MED_REQUISITION_SYSTEM}|${requisitionId}`,
                },
                { cache: 'no-cache' }
              );
            } catch (err) {
              console.error(err);
              lastErr = err as Error;
            }
            retries++;
            sleepTime *= 2; // Should be 1000, 2000, 4000, 8000
          }
          if (!serviceRequest) {
            showNotification({
              color: 'red',
              title: 'Error',
              message: `Unable to find referral with requisition ID '${requisitionId}'`,
              autoClose: false,
            });
            console.error(`Unable to find referral with requisition ID: ${requisitionId}`);
            console.error('Last error while retrying', lastErr);
            return;
          }
          navigate(`/ServiceRequest/${serviceRequest.id as string}`);
        })
        .catch(console.error);
    },
    [medplum, navigate]
  );

  return (
    <Container fluid>
      <QuestionnaireForm
        questionnaire={{ reference: 'Questionnaire/4469a0a6-10e3-4712-b735-a32b121d45e1' }}
        onSubmit={handleSubmit}
      />
    </Container>
  );
}
