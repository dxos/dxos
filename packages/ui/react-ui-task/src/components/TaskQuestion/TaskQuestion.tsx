//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, type SyntheticEvent, useCallback, useState } from 'react';

import { Button, Field, Flex, Icon, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type Task } from '@dxos/types';

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
    <Flex column gap='xs' asChild classNames={['text-sm', classNames]}>
      <div
        role='group'
        aria-label={question.text}
        data-testid='task-question'
        onClick={stop}
        onPointerDown={stop}
        onKeyDown={stop}
      >
        <Flex align='start' gap='sm'>
          <Icon icon='ph--question--regular' classNames='mt-0.5 shrink-0 text-amber-text' />
          <span className='font-medium break-words'>{question.text}</span>
        </Flex>

        {question.context && !answer && (
          <p className='ps-6 text-description break-words line-clamp-3'>{question.context}</p>
        )}

        {answer ? (
          <Flex align='start' gap='sm' data-testid='task-question.answer'>
            <Icon icon='ph--check-circle--regular' classNames='mt-0.5 shrink-0 text-success-text' />
            <span className='break-words'>{answer.answer}</span>
          </Flex>
        ) : (
          onAnswer && (
            <Flex column gap='xs' classNames='ps-6'>
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
                  <Flex column grow gap='xs' classNames='text-start'>
                    <div className='font-medium break-words'>{option.title}</div>
                    {option.description && (
                      <div className='text-xs text-description break-words leading-snug'>{option.description}</div>
                    )}
                  </Flex>
                </Button>
              ))}
              {/* Wraps rather than squeezes: in a narrow host (a popover card) the field keeps a usable
                  width and the button drops below it. */}
              <Flex wrap gap='xs'>
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
              </Flex>
            </Flex>
          )
        )}

        {message && (
          <p className='ps-6 text-description' data-testid='task-question.message'>
            {message}
          </p>
        )}
      </div>
    </Flex>
  );
};

TaskQuestion.displayName = 'TaskQuestion';
