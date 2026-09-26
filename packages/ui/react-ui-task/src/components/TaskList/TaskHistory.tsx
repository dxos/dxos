//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Column, Icon, type ThemedClassName, Timestamp, useTranslation } from '@dxos/react-ui';
import { Task } from '@dxos/types';
import { getStyles, mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { TASK_GRID, TASK_GRID_ICON } from '../task-grid.ts';
import { TaskQuestion } from '../TaskQuestion/index.ts';
import { UNSET_ICON } from './status-icons.ts';

/**
 * The glyph per event, keyed by the `Task.Event` the entry records — a table rather than a ternary,
 * so a new event kind is one line here instead of a condition to find in the markup.
 */
type EventIcon = { icon: string; hue: string };

const EVENT_ICONS: Record<Task.Event, EventIcon> = {
  created: { icon: 'ph--plant--regular', hue: 'emerald' },
  updated: { icon: 'ph--pencil-simple--regular', hue: 'indigo' },
  question: { icon: 'ph--question--regular', hue: 'amber' },
  answer: { icon: 'ph--check-circle--regular', hue: 'emerald' },
};

/** The line an entry reads as: a change's own note, or the question asked and the answer given. */
const entryText = (entry: Task.HistoryEntry): string => {
  switch (entry.event) {
    case 'question':
      return entry.text;
    case 'answer':
      return entry.answer;
    default:
      return entry.description ?? entry.event;
  }
};

/** Falls back to the unset glyph: an entry written by an older schema still renders as a row. */
const eventIcon = (event: Task.Event): EventIcon => EVENT_ICONS[event] ?? { icon: UNSET_ICON, hue: 'neutral' };

export type TaskHistoryProps = ThemedClassName<{
  entries: readonly Task.HistoryEntry[];
  /**
   * Entries to show, newest first; the rest are left to a surface with room for them. An open
   * question is shown whatever its age — it is waiting on the reader, not a record of the past.
   */
  limit?: number;
  /** Enables answering an open question in place; absent renders questions read-only. */
  onAnswer?: (questionId: string, answer: string) => void;
}>;

type HistoryItem =
  | { type: 'entry'; entry: Task.HistoryEntry; icon: string; hue: string }
  | { type: 'question'; thread: Task.QuestionThread };

/**
 * The log as the reader sees it, newest first: a question becomes one item carrying its answer, at
 * the position it was asked, and the answer entry it was joined with is not repeated on its own.
 */
const buildItems = (entries: readonly Task.HistoryEntry[], limit: number): HistoryItem[] => {
  const threads = new Map(Task.getQuestions(entries).map((thread) => [thread.question.id, thread]));
  const items: HistoryItem[] = [];
  for (const entry of [...entries].reverse()) {
    if (Task.isQuestionEntry(entry)) {
      const thread = threads.get(entry.id);
      if (thread) {
        items.push({ type: 'question', thread });
        continue;
      }
    }
    // Folded into its question; a second answer to the same question is not, so it still shows.
    if (Task.isAnswerEntry(entry) && threads.get(entry.questionId)?.answer === entry) {
      continue;
    }
    const { icon, hue } = eventIcon(entry.event);
    items.push({ type: 'entry', entry, icon, hue: getStyles(hue).text });
  }

  return items.filter((item, index) => index < limit || (item.type === 'question' && !item.thread.answer));
};

/**
 * A task's activity log, newest first.
 *
 * Each entry already carries the human-readable record of what happened, so a line is that sentence
 * plus when it happened and who did it — the pane adds no interpretation of its own. A question is
 * the exception: it is shown where it was asked, with its answer, and is answerable there while open,
 * so the exchange reads in the order it happened rather than split between a prompt and a log.
 */
export const TaskHistory = ({ entries, limit = 5, onAnswer, classNames }: TaskHistoryProps) => {
  const { t } = useTranslation(translationKey);
  const items = useMemo(() => buildItems(entries, limit), [entries, limit]);

  if (items.length === 0) {
    return null;
  }

  return (
    // The log spans the host Column's tracks and re-exposes them, so each entry's glyph sits in the
    // gutter with the pane's other glyphs and its text in the content track with the pane's text —
    // rather than in a second set of columns that happens to look similar.
    <Column.Section
      role='list'
      label={t('task-history.label')}
      aria-label={t('task-history.label')}
      data-testid='taskList.history'
      gap='sm'
      classNames={mx('text-sm text-description', classNames)}
    >
      {items.map((item, index) =>
        item.type === 'question' ? (
          <div key={item.thread.question.id} role='listitem' className='min-w-0'>
            <TaskQuestion
              thread={item.thread}
              date={item.thread.question.date}
              onAnswer={onAnswer && ((answer) => onAnswer(item.thread.question.id, answer))}
            />
          </div>
        ) : (
          // The section's geometry, a grid rather than a flex row: the glyph column is a fixed 24px,
          // so a history glyph sits on the same axis as a property's and a question's however wide
          // each section's own text runs.
          <div
            key={item.entry.id ?? `${item.entry.date}-${index}`}
            role='listitem'
            className={mx(TASK_GRID, 'min-w-0')}
          >
            {/* The hue comes from the event table, through the same palette the status and priority
                glyphs read. */}
            <div className={TASK_GRID_ICON}>
              <Icon icon={item.icon} classNames={item.hue} size={4} />
            </div>
            {/* The time rides with the description rather than in a column of its own: flush right
                against the content's edge is where the eye reads it, and a third track would make the
                log a different shape from the sections above it. */}
            <div className='flex gap-2 min-w-0'>
              {/* Wraps: an entry is a sentence, and truncating it hides what actually happened. */}
              <span className='grow min-w-0'>{entryText(item.entry)}</span>
              {/* Compact and live, because the log is read as "what has been happening" rather than
                  as a record to cite — and the record is a hover away, in the tooltip. */}
              <Timestamp date={item.entry.date} classNames='shrink-0 text-right' />
            </div>
          </div>
        ),
      )}
    </Column.Section>
  );
};

TaskHistory.displayName = 'TaskList.History';
