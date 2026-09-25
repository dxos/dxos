//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Column, Icon, IconBlock, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type Task } from '@dxos/types';
import { getStyles, mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { formatRelative } from '../../util/index.ts';
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
  /** Entries to show, newest first; the rest are left to a surface with room for them. */
  limit?: number;
}>;

/**
 * A task's activity log, newest first.
 *
 * Each entry already carries the human-readable record of what happened, so a line is that sentence
 * plus when it happened and who did it — the pane adds no interpretation of its own.
 */
export const TaskHistory = ({ entries, limit = 5, classNames }: TaskHistoryProps) => {
  const { t } = useTranslation(translationKey);
  // Newest first, without mutating the task's own array (append-only, oldest first).
  const visible = useMemo(
    () =>
      [...entries]
        .reverse()
        .slice(0, limit)
        .map((entry) => {
          const { icon, hue } = eventIcon(entry.event);
          return { entry, icon, hue: getStyles(hue).text };
        }),
    [entries, limit],
  );

  if (visible.length === 0) {
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
      {visible.map(({ entry, icon, hue }, index) => (
        // The whole entry sits in the content track, glyph included: the log is prose about the
        // task rather than a set of controls, so its icons read as part of each line instead of
        // hanging in the gutter where the pane's affordances live.
        //
        // `items-start`, since a wrapped description makes the line taller than one row: centring
        // would then float the glyph against the middle of the paragraph.
        <div key={`${entry.date}-${index}`} role='listitem' className='flex items-start gap-1 min-w-0'>
          {/* Exactly one line box tall, so the glyph it centres sits on the centre of the entry's
              FIRST line: a fixed square is taller than a line, which floats the glyph below that
              centre, and a wrapped description would otherwise carry it down the paragraph. The hue
              comes from the event table, through the same palette the status and priority glyphs
              read. */}
          <IconBlock classNames='w-6 h-[1lh] shrink-0'>
            <Icon icon={icon} classNames={hue} />
          </IconBlock>
          {/* Wraps: an entry is a sentence, and truncating it hides what actually happened. */}
          <div className='grow min-w-0'>{entryText(entry)}</div>
          {/* Relative, because the log is read as "what has been happening" rather than as a record
              to cite; the exact timestamp stays on the entry for a surface that needs it. */}
          <span className='shrink-0 whitespace-nowrap tabular-nums text-right'>{formatRelative(entry.date)}</span>
        </div>
      ))}
    </Column.Section>
  );
};

TaskHistory.displayName = 'TaskList.History';
