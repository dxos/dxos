//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Routine from '@dxos/compute/Routine';
import { Obj } from '@dxos/echo';
import { Accordion, Empty, Icon, type IconProps, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { meta } from '#meta';

import { type RoutineRun, type RunStatus } from './runs.ts';
import { useRoutineRuns } from './useRoutineRuns.ts';

const STATUS_ICONS: Record<RunStatus, string> = {
  success: 'ph--check-circle--regular',
  failure: 'ph--x-circle--regular',
  incomplete: 'ph--arrows-clockwise--regular',
  pending: 'ph--clock--regular',
};

const STATUS_ICON_PROPS: Record<RunStatus, Pick<IconProps, 'valence' | 'tone'>> = {
  success: { valence: 'success' },
  failure: { valence: 'error' },
  incomplete: { valence: 'warning' },
  pending: { tone: 'description' },
};

export type RoutineTraceCompanionProps = {
  role?: string;
  subject: Routine.Routine;
};

/** Companion panel showing the execution trace (runs) of a Routine. */
export const RoutineTraceCompanion = ({ role, subject }: RoutineTraceCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(subject);
  const runs = useRoutineRuns(db, subject);

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root />
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            {runs.length === 0 ? (
              <Empty>{t('history.empty.message')}</Empty>
            ) : (
              <Accordion.Root>
                {runs.map((run) => (
                  <Accordion.Item key={getRunId(run)} value={getRunId(run)}>
                    <Accordion.ItemTrigger>
                      <span className='flex items-center gap-2 min-w-0'>
                        <Icon icon={STATUS_ICONS[run.status]} {...STATUS_ICON_PROPS[run.status]} />
                        <span className='tabular-nums'>{formatTimestamp(run.startedAt)}</span>
                        <span className='truncate text-description'>
                          {`${t(`history.status.${run.status}.label`)} · ${formatDuration(run.duration)}`}
                        </span>
                      </span>
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent>
                      <JsonHighlighter data={toJsonData(run)} classNames='[&_pre]:!text-xs [&_code]:!text-xs' />
                    </Accordion.ItemContent>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
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

const formatTimestamp = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

const toJsonData = (run: RoutineRun) => ({
  pid: run.pid,
  startedAt: new Date(run.startedAt).toISOString(),
  duration: run.duration,
  status: run.status,
  ...(run.conversation && { conversation: run.conversation.uri }),
  events: run.events.map((evt) => ({
    type: evt.type,
    timestamp: new Date(evt.timestamp).toISOString(),
    ...(evt.pid && { pid: evt.pid }),
    ...(evt.processName && { processName: evt.processName }),
    data: evt.data,
  })),
});

const getRunId = (run: RoutineRun) => run.pid;

RoutineTraceCompanion.displayName = 'RoutineTraceCompanion';
