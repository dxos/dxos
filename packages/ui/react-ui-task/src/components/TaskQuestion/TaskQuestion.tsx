//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, type SyntheticEvent, useCallback, useState } from 'react';

import { Button, Field, Icon, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { TASK_GRID, TASK_GRID_CONTENT, TASK_GRID_ICON } from '../task-grid.ts';

/**
 * Stops an event at the question: it sits inside a listbox row, whose click selects the task and
 * whose arrow keys move the selection, and typing an answer must do neither.
 */
const stop = (event: SyntheticEvent) => event.stopPropagation();

export type TaskQuestionProps = ThemedClassName<{
  thread: Task.QuestionThread;
  /** An answer is in flight; the controls are disabled until it settles. */
  busy?: boolean;
  /** A line under the controls — a failed write, or an answer that landed but woke nobody. */
  message?: string;
  /**
   * One line for the question and one for its answer, with no context or controls — for a list row,
   * where the full prompt would crowd out the tasks; the host's detail surface renders it in full.
   */
  // TODO(burdon): Remove. This should be a different component.
  compact?: boolean;
  /** Enables answering; absent renders the question read-only. */
  onAnswer?: (answer: string) => void;
}>;

/**
 * A question from a task's history: why it was asked, and the means to answer it. Answered, it
 * collapses to the question and the answer, since the exchange is then a record rather than a
 * prompt.
 *
 * The free-form field is always present, never a fallback revealed by a "something else" option:
 * the options are the asker's guesses, and making the reader hunt for the escape hatch pressures
 * them into picking a wrong one.
 */
// TODO(burdon): Rewrite/move to react-ui-assistant widgets.
export const TaskQuestion = ({
  classNames,
  thread: { question, answer },
  busy,
  message,
  compact,
  onAnswer,
}: TaskQuestionProps) => {
  const { t } = useTranslation(translationKey);
  const [text, setText] = useState('');

  const handleSubmit = useCallback<NonNullable<TaskQuestionProps['onAnswer']>>(
    (value) => {
      if (!busy && value.trim().length > 0) {
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
        handleSubmit(text);
      }
    },
    [handleSubmit, text],
  );

  if (compact) {
    // No event stopping: nothing here takes input, so a click falls through to the row and selects
    // the task — which is how the reader reaches the full question.
    return (
      <div
        role='group'
        aria-label={question.text}
        className={mx('flex flex-col w-full gap-1 text-sm', classNames)}
        data-testid='task-question'
      >
        <div className='flex items-center gap-2 min-w-0'>
          <Icon icon='ph--question--regular' classNames='text-warning-text' />
          <span className='font-medium truncate' title={question.text}>
            {question.text}
          </span>
        </div>
        {answer && (
          <div className='flex items-center gap-2 min-w-0' data-testid='task-question.answer'>
            <Icon icon='ph--check-circle--regular' classNames='text-success-text' />
            <span className='truncate' title={answer.answer}>
              {answer.answer}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    // An element of its own, so the question can stop the events below: it sits inside a listbox
    // row, whose click selects the task and whose arrow keys move the selection, and typing an
    // answer must do neither.
    <div
      role='group'
      aria-label={question.text}
      // Its own two columns, not the host Column's tracks: the glyph is the question's own first
      // cell now, so re-exposing the host's tracks (`withColumn.propagate`) would replace this
      // template with a subgrid and drop the text into whatever the host's second track happens to
      // be. The host places the question as a whole; the question places what is inside it.
      className={mx(TASK_GRID, 'gap-y-2 text-sm', classNames)}
      data-testid='task-question'
      onClick={stop}
      onPointerDown={stop}
      onKeyDown={stop}
    >
      {/* The question's own row: its glyph in the shared column, its text beside it. Everything
          below — the context, the options, the answer field — is that same second column, so the
          question reads as one block hanging off one glyph rather than as four indented things. */}
      <div className={TASK_GRID_ICON}>
        <Icon icon='ph--question--regular' classNames='text-warning-text' />
      </div>
      <span className='font-medium wrap-break-word min-w-0'>{question.text}</span>

      {question.context && !answer && (
        <p className={mx(TASK_GRID_CONTENT, 'text-description wrap-break-word line-clamp-3 min-w-0')}>
          {question.context}
        </p>
      )}

      {answer ? (
        <>
          <div className={TASK_GRID_ICON}>
            <Icon icon='ph--check-circle--regular' classNames='text-success-text' />
          </div>
          <span className='wrap-break-word min-w-0' data-testid='task-question.answer'>
            {answer.answer}
          </span>
        </>
      ) : (
        onAnswer && (
          <div className={mx(TASK_GRID_CONTENT, 'flex flex-col gap-2 min-w-0')}>
            {/* A list of its own, one item per option: each is a separate choice with its own
                description, and read as one block of buttons they ran together. */}
            {question.options && question.options.length > 0 && (
              <div role='list' aria-label={question.text} className='flex flex-col gap-1 min-w-0'>
                {question.options.map((option, index) => (
                  <div key={option.title} role='listitem' className='min-w-0'>
                    <Button
                      variant='default'
                      disabled={busy}
                      // `h-auto` and wrapping: an option is a sentence, not a label, so the button
                      // grows to its text instead of clipping it.
                      classNames='w-full min-w-0 h-auto py-1.5 justify-start text-start whitespace-normal'
                      data-testid='task-question.option'
                      onClick={() => handleSubmit(option.title)}
                    >
                      {/* Numbered, so the options can be referred to — an agent asking again, a
                          person saying "the second one" — rather than quoted back in full. On the
                          first line and top-aligned, since an option's text wraps. */}
                      <div className='shrink-0 tabular-nums text-description self-start'>{index + 1}.</div>
                      {/* `div`, not `span`: `Button` carries `[&_span]:truncate`. */}
                      <div className='grow min-w-0 flex flex-col gap-0.5 text-start'>
                        <div className='font-medium wrap-break-word'>{option.title}</div>
                        {option.description && (
                          <div className='text-xs text-description wrap-break-word leading-snug'>
                            {option.description}
                          </div>
                        )}
                      </div>
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
                onClick={() => handleSubmit(text)}
              >
                {t('question-submit.label')}
              </Button>
            </div>
          </div>
        )
      )}

      {message && (
        <p className={mx(TASK_GRID_CONTENT, 'text-description min-w-0')} data-testid='task-question.message'>
          {message}
        </p>
      )}
    </div>
  );
};

TaskQuestion.displayName = 'TaskQuestion';
