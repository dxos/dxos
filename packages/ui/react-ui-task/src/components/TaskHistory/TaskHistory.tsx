//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Container from '@dxos/react-ui/Container';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Typography from '@dxos/react-ui/Typography';
import type * as Util from '@dxos/react-ui/Util';
import { Task } from '@dxos/types';
import { getStyles, mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { UNSET_ICON } from '../../util/status-icons.ts';
import { TASK_GRID, TASK_GRID_ICON } from '../task-grid.ts';

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

/** The line an entry reads as: a change's own note. */
const entryText = (entry: Task.HistoryEntry): string =>
  entry.event === 'question'
    ? entry.text
    : entry.event === 'answer'
      ? entry.answer
      : (entry.description ?? entry.event);

/** Falls back to the unset glyph: an entry written by an older schema still renders as a row. */
const eventIcon = (event: Task.Event): EventIcon => EVENT_ICONS[event] ?? { icon: UNSET_ICON, hue: 'neutral' };

export type TaskHistoryProps = Util.ThemedClassName<{
  entries: readonly Task.HistoryEntry[];
  /** Entries to show, newest first; the rest are left to a surface with room for them. */
  limit?: number;
}>;

type HistoryItem = {
  key: string;
  icon: string;
  hue: string;
  text: string;
  /** The answer, for an exchange: shown under its question as one item. */
  answer?: string;
  date: string;
};

/**
 * The log as the reader sees it, newest first. A question is an item only once answered — an open
 * one is waiting on the reader and belongs with the task's open questions, not in its record — and
 * then question and answer are one item, dated when the exchange closed.
 */
const buildItems = (entries: readonly Task.HistoryEntry[], limit: number): HistoryItem[] => {
  const threads = new Map(Task.getQuestions(entries).map((thread) => [thread.question.id, thread]));
  const items: HistoryItem[] = [];
  for (const [index, entry] of [...entries].reverse().entries()) {
    if (Task.isQuestionEntry(entry)) {
      continue;
    }

    const thread = Task.isAnswerEntry(entry) ? threads.get(entry.questionId) : undefined;
    // The answer that closed its question stands for the exchange; a second answer to the same
    // question is not the one that closed it, so it reads as an entry of its own.
    if (thread && thread.answer === entry) {
      const { icon, hue } = eventIcon('question');
      items.push({
        key: entry.id,
        icon,
        hue: getStyles(hue).text,
        text: thread.question.text,
        answer: entry.answer,
        date: entry.date,
      });
      continue;
    }

    const { icon, hue } = eventIcon(entry.event);
    items.push({
      key: entry.id ?? `${entry.date}-${index}`,
      icon,
      hue: getStyles(hue).text,
      text: entryText(entry),
      date: entry.date,
    });
  }

  return items.slice(0, limit);
};

/**
 * A task's activity log, newest first.
 *
 * Each entry already carries the human-readable record of what happened, so a line is that sentence
 * plus when it happened — the pane adds no interpretation of its own. An answered question reads as
 * one line with its answer under it; an open one is not part of the record yet.
 */
export const TaskHistory = ({ entries, limit = 5, classNames }: TaskHistoryProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const items = useMemo(() => buildItems(entries, limit), [entries, limit]);

  if (items.length === 0) {
    return null;
  }

  return (
    // The log spans the host Column's tracks and re-exposes them, so each entry's glyph sits in the
    // gutter with the pane's other glyphs and its text in the content track with the pane's text —
    // rather than in a second set of columns that happens to look similar.
    // A section of the host Container: it inherits the host's tracks, so its glyphs share the pane's gutter.
    <Container.Container
      asChild
      gutter='inherit'
      gap='sm'
      role='list'
      aria-label={t('task-history.label')}
      data-testid='taskList.history'
      classNames={mx('text-sm text-fg-muted', classNames)}
    >
      <section>
        {/* Set as the form's field labels are, so the article's section headings read as one with them. */}
        <Typography.Text asChild tone='subtle' classNames='dx-label py-0'>
          <h2>{t('task-history.label')}</h2>
        </Typography.Text>
        {items.map((item) => (
          // The section's geometry, a grid rather than a flex row: the glyph column is a fixed 24px,
          // so a history glyph sits on the same axis as a property's however wide each section's text runs.
          <div key={item.key} role='listitem' className={mx(TASK_GRID, 'min-w-0')}>
            {/* The hue comes from the event table, through the same palette the status and priority
              glyphs read. */}
            <div className={TASK_GRID_ICON}>
              <Icon.Icon icon={item.icon} classNames={item.hue} size='md' />
            </div>
            {/* The time rides with the description rather than in a column of its own: flush right
              against the content's edge is where the eye reads it, and a third track would make the
              log a different shape from the sections above it. */}
            <div className='flex gap-2 min-w-0'>
              {/* Wraps: an entry is a sentence, and truncating it hides what actually happened. */}
              <span className='grow min-w-0'>
                {item.text}
                {item.answer && (
                  <span className='block text-fg' data-testid='taskList.history.answer'>
                    {item.answer}
                  </span>
                )}
              </span>
              {/* Compact and live, because the log is read as "what has been happening" rather than
                as a record to cite — and the record is a hover away, in the tooltip. */}
              <Typography.Timestamp date={item.date} classNames='shrink-0 text-right' />
            </div>
          </div>
        ))}
      </section>
    </Container.Container>
  );
};

TaskHistory.displayName = 'TaskList.History';
