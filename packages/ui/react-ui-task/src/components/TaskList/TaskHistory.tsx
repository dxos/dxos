//
// Copyright 2026 DXOS.org
//

import { formatDistanceToNow } from 'date-fns';
import React, { useMemo } from 'react';

import { Icon, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

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
  const visible = useMemo(() => [...entries].reverse().slice(0, limit), [entries, limit]);
  if (visible.length === 0) {
    return null;
  }

  return (
    <div
      role='list'
      aria-label={t('task-history.label')}
      data-testid='taskList.history'
      className={mx('flex flex-col gap-0.5 text-xs text-subdued', classNames)}
    >
      {visible.map((entry, index) => (
        <div key={`${entry.date}-${index}`} role='listitem' className='flex min-w-0 items-baseline gap-1.5'>
          <Icon icon={entry.event === 'created' ? 'ph--plus--regular' : 'ph--pencil-simple--regular'} size={3} />
          <span className='truncate'>{entry.description ?? entry.event}</span>
          {/* Relative, because the log is read as "what has been happening" rather than as a record
              to cite; the exact timestamp stays on the entry for a surface that needs it. */}
          <span className='shrink-0 tabular-nums'>{formatRelative(entry.date)}</span>
        </div>
      ))}
    </div>
  );
};

TaskHistory.displayName = 'TaskList.History';

/** Tolerates an unparseable date rather than throwing: the log is decoration, never the source. */
const formatRelative = (date: string): string => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : formatDistanceToNow(parsed, { addSuffix: true });
};
