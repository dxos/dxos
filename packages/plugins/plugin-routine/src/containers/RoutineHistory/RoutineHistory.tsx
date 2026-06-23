//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useRoutineHistory } from './useRoutineHistory';
import { type RunStatus } from './runs';
import { meta } from '#meta';
import { Routine } from '#types';

export type RoutineHistoryProps = {
  role?: string;
  subject: Routine.Routine;
};

const STATUS_CLASSES: Record<RunStatus, string> = {
  success: 'text-success',
  failure: 'text-error',
  pending: 'text-description',
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
};

const formatTimestamp = (ts: number): string => new Date(ts).toLocaleString();

/** Companion panel showing the execution history of a Routine. */
export const RoutineHistory = ({ role, subject }: RoutineHistoryProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(subject);
  const runs = useRoutineHistory(db, subject);

  return (
    <Panel.Root role={role}>
      <Panel.Content classNames='p-2 overflow-auto'>
        {runs.length === 0 ? (
          <p className='text-sm text-description p-2'>{t('history.empty.message')}</p>
        ) : (
          <ul className='flex flex-col gap-1'>
            {runs.map((run) => (
              <li
                key={run.pid}
                className='flex items-center gap-3 rounded px-3 py-2 text-sm hover:bg-hoverSurface'
              >
                <span className={mx('w-16 shrink-0 font-medium', STATUS_CLASSES[run.status])}>
                  {t(`history.status.${run.status}.label`)}
                </span>
                <span className='grow text-description truncate'>{formatTimestamp(run.startedAt)}</span>
                <span className='shrink-0 text-description tabular-nums'>{formatDuration(run.duration)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
