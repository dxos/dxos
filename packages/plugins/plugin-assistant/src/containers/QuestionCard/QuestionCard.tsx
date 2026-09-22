//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { Button, Card, Field, Icon, useTranslation } from '@dxos/react-ui';
import { Question } from '@dxos/types';

import { meta } from '#meta';
import { AssistantOperation } from '#types';

const QUESTION_CARD_NAME = 'QuestionCard';

export type QuestionCardProps = AppSurface.ObjectCardProps<Question.Question>;

/**
 * The card body for a question: why it was asked, and the means to answer it.
 *
 * A `CardContent` surface is the body ONLY — the host draws `Card.Root` and the header.
 *
 * The free-form field is always present, never a fallback revealed by a "something else" option:
 * the options are the asker's guesses, and making the reader hunt for the escape hatch pressures
 * them into picking a wrong one.
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
    <Card.Body data-testid='question-card'>
      {/* The question itself, in the body rather than left to the host's title: every card host
          truncates `Card.Title` to one line, and a question is a sentence that has to be readable
          in full wherever it is shown — inline in the thread and in the task's hover card alike. */}
      <Card.Row>
        <Card.Text classNames='text-base font-medium'>{question.text}</Card.Text>
      </Card.Row>

      {question.context && (
        <Card.Row>
          {/* Clamped, per the card default: in a height-constrained host (the task's hover card)
              an unclamped rationale pushes every option below the fold, and the agent's message in
              the thread already carries the same reasoning in full. */}
          <Card.Text variant='description'>{question.context}</Card.Text>
        </Card.Row>
      )}

      {answered ? (
        <Card.Row data-testid='question-card.answer'>
          <Card.Block>
            <Icon icon='ph--check-circle--regular' />
          </Card.Block>
          <Card.Text>{question.selectedAnswer}</Card.Text>
        </Card.Row>
      ) : (
        <>
          {question.options?.map((option) => (
            // Not `fullWidth`: an option is content, so it lines up with the context above it
            // rather than bleeding past the gutters the rest of the card observes.
            <Card.Row key={option.title}>
              <Button
                variant='default'
                disabled={busy}
                // `h-auto` and wrapping: an option is a sentence, not a label, so the button grows
                // to its text instead of clipping it.
                classNames='w-full min-w-0 h-auto py-2 justify-start text-start whitespace-normal'
                data-testid='question-card.option'
                onClick={() => void submit(option.title)}
              >
                {/* `div`, not `span`: `Button` carries `[&_span]:truncate`. */}
                <div className='grow min-w-0 flex flex-col gap-1 text-start'>
                  <div className='text-sm font-medium break-words'>{option.title}</div>
                  {option.description && (
                    <div className='text-xs text-description break-words leading-snug'>{option.description}</div>
                  )}
                </div>
              </Button>
            </Card.Row>
          ))}

          <Card.Row>
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
          </Card.Row>

          {failed && (
            <Card.Row data-testid='question-card.error'>
              <Card.Text variant='description'>{t('question-failed.message')}</Card.Text>
            </Card.Row>
          )}

          <Card.Row>
            <div className='flex justify-end'>
              <Button
                variant='primary'
                disabled={busy || text.trim() === ''}
                data-testid='question-card.submit'
                onClick={() => void submit(text)}
              >
                {t('question-submit.label')}
              </Button>
            </div>
          </Card.Row>
        </>
      )}

      {stranded && (
        <Card.Row data-testid='question-card.stranded'>
          <Card.Text variant='description'>{t('question-stranded.message')}</Card.Text>
        </Card.Row>
      )}
    </Card.Body>
  );
};

QuestionCard.displayName = QUESTION_CARD_NAME;
