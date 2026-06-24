//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { Icon, List, ListItem, Panel, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Routine } from '#types';

import { type RunStatus } from './runs';
import { useRoutineHistory } from './useRoutineHistory';

export type RoutineHistoryProps = {
  role?: string;
  subject: Routine.Routine;
};

const STATUS_ICONS: Record<RunStatus, string> = {
  success: 'ph--check-circle--regular',
  failure: 'ph--x-circle--regular',
  pending: 'ph--clock--regular',
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
  const totalSeconds = Math.round(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
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
      <Panel.Content classNames='overflow-auto'>
        {runs.length === 0 ? (
          <p className='text-sm text-description p-2'>{t('history.empty.message')}</p>
        ) : (
          <List>
            {runs.map((run) => (
              <ListItem.Root key={run.pid} classNames='px-2'>
                <ListItem.Endcap>
                  <Icon icon={STATUS_ICONS[run.status]} size={5} classNames={STATUS_CLASSES[run.status]} />
                </ListItem.Endcap>
                <ListItem.Heading classNames='flex flex-col items-start grow truncate'>
                  <div className='truncate'>{formatTimestamp(run.startedAt)}</div>
                  <div className='text-description text-sm truncate'>
                    {t(`history.status.${run.status}.label`)} · {formatDuration(run.duration)}
                  </div>
                </ListItem.Heading>
              </ListItem.Root>
            ))}
          </List>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
