import { Container } from '@mantine/core';
import { createReference, getQuestionnaireAnswers, resolveId } from '@medplum/core';

import { Questionnaire, QuestionnaireResponse, Reference } from '@medplum/fhirtypes';
import { QuestionnaireForm, useMedplum, useMedplumNavigate } from '@medplum/react';
import { useCallback, useState } from 'react';

export function NewPatientPage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useMedplumNavigate();
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Reference<Questionnaire>>({
    reference: 'Questionnaire/4469a0a6-10e3-4712-b735-a32b121d45e1',
  });

  const handleSubmit = useCallback(
    (response: QuestionnaireResponse) => {
      if (currentQuestionnaire.reference === 'Questionnaire/4469a0a6-10e3-4712-b735-a32b121d45e1') {
        const answers = getQuestionnaireAnswers(response);
        medplum
          .createResource(response)
          .then(async () => {
            const docReference = answers.primaryAcceptingPhysician.valueReference;
            if (!docReference) {
              console.error('Invalid primaryAcceptingPhysician reference');
              return;
            }
            medplum
              .searchOne('Questionnaire', `context=${resolveId(docReference) ?? ''}`)
              .then((questionnaire) => {
                if (!questionnaire) {
                  navigate('/transfers');
                  return;
                }
                setCurrentQuestionnaire(createReference<Questionnaire>(questionnaire));
              })
              .catch(console.error);
          })
          .catch(console.error);
      } else {
        medplum
          .createResource(response)
          .then(() => {
            setCurrentQuestionnaire({ reference: 'Questionnaire/4469a0a6-10e3-4712-b735-a32b121d45e1' });
            navigate('/transfers');
          })
          .catch(console.error);
      }
    },
    [medplum, navigate, currentQuestionnaire.reference]
  );

  return (
    <Container fluid>
      <QuestionnaireForm questionnaire={currentQuestionnaire} onSubmit={handleSubmit} />
    </Container>
  );
}
