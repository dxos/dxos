//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, type SyntheticEvent, useCallback, useState } from 'react';

import { Button, Field, Icon, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

export type TaskQuestionProps = ThemedClassName<{
  thread: Task.QuestionThread;
  /** Enables answering; absent renders the question read-only. */
  onAnswer?: (answer: string) => void;
  /** An answer is in flight; the controls are disabled until it settles. */
  busy?: boolean;
  /** A line under the controls — a failed write, or an answer that landed but woke nobody. */
  message?: string;
}>;

/**
 * Stops an event at the question: it sits inside a listbox row, whose click selects the task and
 * whose arrow keys move the selection, and typing an answer must do neither.
 */
const stop = (event: SyntheticEvent) => event.stopPropagation();

/**
 * A question from a task's history: why it was asked, and the means to answer it. Answered, it
 * collapses to the question and the answer, since the exchange is then a record rather than a
 * prompt.
 *
 * The free-form field is always present, never a fallback revealed by a "something else" option:
 * the options are the asker's guesses, and making the reader hunt for the escape hatch pressures
 * them into picking a wrong one.
 */
export const TaskQuestion = ({
  classNames,
  thread: { question, answer },
  onAnswer,
  busy,
  message,
}: TaskQuestionProps) => {
  const { t } = useTranslation(translationKey);
  const [text, setText] = useState('');

  const submit = useCallback(
    (value: string) => {
      if (!busy && value.trim() !== '') {
        onAnswer?.(value);
      }
    },
    [busy, onAnswer],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        submit(text);
      }
    },
    [submit, text],
  );

  return (
    <div
      role='group'
      aria-label={question.text}
      className={mx('flex flex-col gap-1 text-sm', classNames)}
      data-testid='task-question'
      onClick={stop}
      onPointerDown={stop}
      onKeyDown={stop}
    >
      <div className='flex items-start gap-2'>
        <Icon icon='ph--question--regular' classNames='mt-0.5 shrink-0 text-amber-text' />
        <span className='font-medium break-words'>{question.text}</span>
      </div>

      {question.context && !answer && (
        <p className='ps-6 text-description break-words line-clamp-3'>{question.context}</p>
      )}

      {answer ? (
        <div className='flex items-start gap-2' data-testid='task-question.answer'>
          <Icon icon='ph--check-circle--regular' classNames='mt-0.5 shrink-0 text-success-text' />
          <span className='break-words'>{answer.answer}</span>
        </div>
      ) : (
        onAnswer && (
          <div className='flex flex-col gap-1 ps-6'>
            {question.options?.map((option) => (
              <Button
                key={option.title}
                variant='default'
                disabled={busy}
                // `h-auto` and wrapping: an option is a sentence, not a label, so the button grows
                // to its text instead of clipping it.
                classNames='w-full min-w-0 h-auto py-1.5 justify-start text-start whitespace-normal'
                data-testid='task-question.option'
                onClick={() => submit(option.title)}
              >
                {/* `div`, not `span`: `Button` carries `[&_span]:truncate`. */}
                <div className='grow min-w-0 flex flex-col gap-0.5 text-start'>
                  <div className='font-medium break-words'>{option.title}</div>
                  {option.description && (
                    <div className='text-xs text-description break-words leading-snug'>{option.description}</div>
                  )}
                </div>
              </Button>
            ))}
            {/* Wraps rather than squeezes: in a narrow host (a popover card) the field keeps a usable
                width and the button drops below it. */}
            <div className='flex flex-wrap gap-1'>
              <div className='flex-[1_1_10rem] min-w-0'>
                <Field.Root>
                  <Field.Label srOnly>{t('question-answer.label')}</Field.Label>
                  <Field.Input
                    value={text}
                    disabled={busy}
                    placeholder={t('question-answer.placeholder')}
                    data-testid='task-question.input'
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </Field.Root>
              </div>
              <Button
                variant='primary'
                disabled={busy || text.trim() === ''}
                data-testid='task-question.submit'
                onClick={() => submit(text)}
              >
                {t('question-submit.label')}
              </Button>
            </div>
          </div>
        )
      )}

      {message && (
        <p className='ps-6 text-description' data-testid='task-question.message'>
          {message}
        </p>
      )}
    </div>
  );
};

TaskQuestion.displayName = 'TaskQuestion';
