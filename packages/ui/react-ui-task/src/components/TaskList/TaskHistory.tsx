//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Icon, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { formatRelative } from '../../util/index.ts';
import { UNSET_ICON } from './status-icons.ts';

/**
 * The glyph per event, keyed by the `Task.Event` the entry records — a table rather than a ternary,
 * so a new event kind is one line here instead of a condition to find in the markup.
 */
const EVENT_ICONS: Record<Task.Event, string> = {
  created: 'ph--plant--regular',
  updated: 'ph--pencil-simple--regular',
};

/** Falls back to the unset glyph: an entry written by an older schema still renders as a row. */
const eventIcon = (event: Task.Event): string => EVENT_ICONS[event] ?? UNSET_ICON;

export type TaskHistoryProps = ThemedClassName<{
  entries: readonly Task.HistoryEntry[];
  /** Entries to show, newest first; the rest are left to a surface with room for them. */
  limit?: number;
  /**
   * Lay the log out on the host's own columns (`grid-cols-subgrid`), so an entry's glyph sits under
   * the host's leading icon and its text under the host's text. The host must place this across the
   * tracks it wants inherited. Off by default: a log rendered away from a grid has none to inherit.
   */
  subgrid?: boolean;
  /** Cell placement per entry, when `subgrid` — the host names its own tracks. */
  cells?: { icon?: string; description?: string; date?: string };
}>;

/**
 * A task's activity log, newest first.
 *
 * Each entry already carries the human-readable record of what happened, so a line is that sentence
 * plus when it happened and who did it — the pane adds no interpretation of its own.
 */
export const TaskHistory = ({ entries, limit = 5, subgrid, cells, classNames }: TaskHistoryProps) => {
  const { t } = useTranslation(translationKey);
  // Newest first, without mutating the task's own array (append-only, oldest first).
  const visible = useMemo(() => [...entries].reverse().slice(0, limit), [entries, limit]);
  if (visible.length === 0) {
    return null;
  }

  return (
    // One grid for the whole log, not a stack of rows each laying itself out: the glyph column and
    // the time column are then the same width down every entry, so the times line up as a column
    // instead of trailing each description wherever it happens to end.
    <div
      role='list'
      aria-label={t('task-history.label')}
      data-testid='taskList.history'
      className={mx(
        'grid items-baseline gap-y-1 text-sm text-description',
        // The host's tracks, so the log's columns are the host's columns rather than a second set
        // that happens to look similar.
        subgrid ? 'grid-cols-subgrid' : 'grid-cols-[min-content_1fr_min-content]',
        classNames,
      )}
    >
      {visible.map((entry, index) => (
        // A subgrid spanning the log's three tracks: the entry keeps its `listitem` semantics while
        // its cells sit on the shared columns rather than on tracks of its own.
        // `items-start`, since a wrapped description makes the row taller than one line: centring
        // would then float the glyph and the time against the middle of the paragraph.
        <div
          key={`${entry.date}-${index}`}
          role='listitem'
          className={mx('grid grid-cols-subgrid items-start', subgrid ? 'col-span-full' : 'col-span-3')}
        >
          {/* One line box tall, with the glyph centred inside it: the row aligns to the top so a
              wrapped description does not float the glyph down the paragraph, which would otherwise
              pin the glyph to the text's ascender rather than to the middle of its first line. */}
          <Icon icon={eventIcon(entry.event)} classNames={mx('block h-[1lh] self-start text-subdued', cells?.icon)} />
          {/* Wraps: an entry is a sentence, and truncating it hides what actually happened — the
              time column is fixed, so the description takes the height it needs. */}
          <span className={mx('min-w-0', cells?.description)}>{entry.description ?? entry.event}</span>
          {/* Relative, because the log is read as "what has been happening" rather than as a record
              to cite; the exact timestamp stays on the entry for a surface that needs it. */}
          <span className={mx('whitespace-nowrap tabular-nums text-right', cells?.date)}>
            {formatRelative(entry.date)}
          </span>
        </div>
      ))}
    </div>
  );
};

TaskHistory.displayName = 'TaskList.History';
