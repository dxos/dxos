//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
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
  // What the write actually did, so the card can say when the answer landed but the agent did not
  // wake — a checkmark over a task that stays blocked forever is the one outcome with no signal.
  const [failed, setFailed] = useState(false);
  const [stranded, setStranded] = useState(false);

  const submit = useCallback(
    async (answer: string) => {
      // The operation's `Database.Service` is space-affinity, so the invocation has to name the
      // space: without it the process spawns with no database and the answer is silently lost.
      const spaceId = Obj.getDatabase(subject)?.spaceId;
      if (busy || !spaceId || answer.trim() === '') {
        return;
      }
      setBusy(true);
      setFailed(false);
      try {
        const result = await invokePromise(
          AssistantOperation.AnswerQuestion,
          { question: subject, answer },
          { spaceId },
        );
        // Rejection is not the only failure: the operation reports a refused write and an
        // unreachable agent in its result, and dropping those leaves the reader with no signal.
        if (result.error || !result.data?.accepted) {
          log.warn('question was not answered', { question: subject.id, error: result.error });
          setFailed(true);
        } else {
          setStranded(!result.data.resumed);
        }
      } catch (err) {
        log.catch(err);
        setFailed(true);
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
    // A popover sizes to its content, so `w-full` is indefinite there and the text would collapse
    // to one character per line; the `min-w` floor is what makes it a card.
    <Flex
      role='group'
      column
      gap='sm'
      classNames='w-full min-w-[18rem] max-w-full my-2 p-3 border border-subdued-separator rounded-sm'
      data-testid='question-card'
    >
      <Flex gap='sm' align='start' classNames='w-full min-w-0'>
        <Icon icon='ph--question--regular' size={5} classNames='shrink-0 text-subdued mt-0.5' />
        <Flex column classNames='grow min-w-0'>
          <p className='text-sm font-medium break-words'>{question.text}</p>
          {question.context && <p className='text-sm text-subdued break-words'>{question.context}</p>}
        </Flex>
      </Flex>

      {answered ? (
        <>
          <Flex gap='sm' align='start' classNames='w-full min-w-0' data-testid='question-card.answer'>
            <Icon icon='ph--check-circle--regular' size={4} classNames='shrink-0 text-subdued mt-0.5' />
            <p className='text-sm grow min-w-0 break-words'>{question.selectedAnswer}</p>
          </Flex>
          {stranded && (
            <p className='text-sm text-warning break-words' data-testid='question-card.stranded'>
              {t('question-stranded.message')}
            </p>
          )}
        </>
      ) : (
        <>
          {question.options?.map((option) => (
            <Button
              key={option.title}
              variant='default'
              disabled={busy}
              // `h-auto`: an option is a sentence, not a label, so the button grows to the text
              // rather than clipping it to one row's height.
              classNames='w-full min-w-0 h-auto py-2 justify-start text-start whitespace-normal'
              data-testid='question-card.option'
              onClick={() => void submit(option.title)}
            >
              {/* `div`, not `span`: `Button` carries `[&_span]:truncate`, and a suggested answer is a
                  sentence rather than a label. */}
              <Flex column classNames='grow min-w-0 text-start'>
                <div className='text-sm break-words'>{option.title}</div>
                {option.description && <div className='text-xs text-subdued break-words'>{option.description}</div>}
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
          {failed && (
            <p className='text-sm text-error break-words' data-testid='question-card.error'>
              {t('question-failed.message')}
            </p>
          )}
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
