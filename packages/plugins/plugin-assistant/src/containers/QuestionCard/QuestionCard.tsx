//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Button, Field, Flex, Icon, useTranslation } from '@dxos/react-ui';
import { Question } from '@dxos/types';

import { meta } from '#meta';
import { AssistantOperation } from '#types';

const QUESTION_CARD_NAME = 'QuestionCard';

export type QuestionCardProps = AppSurface.ObjectCardProps<Question.Question>;

/**
 * A question an agent asked, and the means to answer it.
 *
 * The free-form field is always present, never a fallback revealed by a "something else" option:
 * the options are the asker's guesses, and a surface that makes the reader hunt for the escape
 * hatch pressures them into picking a wrong one.
 */
export const QuestionCard = ({ subject }: QuestionCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  // Snapshot rather than the object: the card must repaint when the answer lands, including when
  // it lands from another surface showing the same question.
  const [question] = useObject(subject);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (answer: string) => {
      // The operation's `Database.Service` is space-affinity, so the invocation has to name the
      // space: without it the process spawns with no database and the answer is silently lost.
      const spaceId = Obj.getDatabase(subject)?.spaceId;
      if (busy || !spaceId || answer.trim() === '') {
        return;
      }
      setBusy(true);
      try {
        await invokePromise(AssistantOperation.AnswerQuestion, { question: subject, answer }, { spaceId });
      } finally {
        setBusy(false);
      }
    },
    [busy, invokePromise, subject],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void submit(text);
      }
    },
    [submit, text],
  );

  if (!question) {
    return null;
  }

  const answered = Question.isAnswered(question);

  return (
    <Flex
      role='group'
      column
      gap='sm'
      classNames='my-2 p-3 border border-subdued-separator rounded-sm'
      data-testid='question-card'
    >
      <Flex gap='sm' align='start'>
        <Icon icon='ph--question--regular' size={5} classNames='shrink-0 text-subdued mt-0.5' />
        <Flex column classNames='min-w-0'>
          <p className='text-sm font-medium'>{question.text}</p>
          {question.context && <p className='text-sm text-subdued'>{question.context}</p>}
        </Flex>
      </Flex>

      {answered ? (
        <Flex gap='sm' align='center' data-testid='question-card.answer'>
          <Icon icon='ph--check-circle--regular' size={4} classNames='shrink-0 text-subdued' />
          <p className='text-sm'>{question.selectedAnswer}</p>
        </Flex>
      ) : (
        <>
          {question.options?.map((option) => (
            <Button
              key={option.title}
              variant='default'
              disabled={busy}
              classNames='justify-start text-start'
              data-testid='question-card.option'
              onClick={() => void submit(option.title)}
            >
              <Flex column classNames='min-w-0'>
                <span className='text-sm truncate'>{option.title}</span>
                {option.description && <span className='text-xs text-subdued truncate'>{option.description}</span>}
              </Flex>
            </Button>
          ))}
          <Field.Root>
            <Field.Label srOnly>{t('question-answer.label')}</Field.Label>
            <Field.Input
              value={text}
              disabled={busy}
              placeholder={t('question-answer.placeholder')}
              data-testid='question-card.input'
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </Field.Root>
          <Flex justify='end'>
            <Button
              variant='primary'
              disabled={busy || text.trim() === ''}
              data-testid='question-card.submit'
              onClick={() => void submit(text)}
            >
              {t('question-submit.label')}
            </Button>
          </Flex>
        </>
      )}
    </Flex>
  );
};

QuestionCard.displayName = QUESTION_CARD_NAME;
