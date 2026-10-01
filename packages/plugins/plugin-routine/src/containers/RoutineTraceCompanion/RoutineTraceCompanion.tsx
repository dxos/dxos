//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Routine from '@dxos/compute/Routine';
import { Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list/next';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';

import { type RoutineRun, type RunStatus } from './runs.ts';
import { useRoutineRuns } from './useRoutineRuns.ts';

const STATUS_ICONS: Record<RunStatus, string> = {
  success: 'ph--check-circle--regular',
  failure: 'ph--x-circle--regular',
  incomplete: 'ph--arrows-clockwise--regular',
  pending: 'ph--clock--regular',
};

const STATUS_CLASSES: Record<RunStatus, string> = {
  success: 'text-success-text',
  failure: 'text-error-text',
  incomplete: 'text-warning-text',
  pending: 'text-description',
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
    <Next.Panel.Root role={role}>
      <Next.Panel.Header>
        <Next.Toolbar.Root />
      </Next.Panel.Header>
      <Next.Panel.Body asChild>
        <Next.ScrollArea.Root orientation='vertical'>
          <Next.ScrollArea.Viewport>
            {runs.length === 0 ? (
              <Next.Empty>{t('history.empty.message')}</Next.Empty>
            ) : (
              <Next.Accordion.Root<RoutineRun> items={runs} getId={getRunId}>
                {({ items }) => (
                  <Next.Container gutter='none'>
                    {items.map((run) => (
                      <Next.Accordion.Item key={run.pid} item={run}>
                        <Next.Accordion.ItemTrigger hover>
                          <Listbox.ItemIcon
                            icon={STATUS_ICONS[run.status]}
                            size='lg'
                            classNames={STATUS_CLASSES[run.status]}
                          />
                          <Listbox.ItemText>
                            {<span className='tabular-nums'>{formatTimestamp(run.startedAt)}</span>}
                          </Listbox.ItemText>
                          <Listbox.ItemDescription>{`${t(`history.status.${run.status}.label`)} · ${formatDuration(run.duration)}`}</Listbox.ItemDescription>
                        </Next.Accordion.ItemTrigger>
                        {/* Match `ItemContent`'s rail/content grid so the JSON aligns under the title column. */}
                        <Next.Accordion.ItemContent classNames='grid grid-cols-[var(--dx-rail-item)_1fr] gap-x-2'>
                          <JsonHighlighter
                            data={toJsonData(run)}
                            classNames='col-start-2 [&_pre]:!text-xs [&_code]:!text-xs'
                          />
                        </Next.Accordion.ItemContent>
                      </Next.Accordion.Item>
                    ))}
                  </Next.Container>
                )}
              </Next.Accordion.Root>
            )}
          </Next.ScrollArea.Viewport>
        </Next.ScrollArea.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
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
