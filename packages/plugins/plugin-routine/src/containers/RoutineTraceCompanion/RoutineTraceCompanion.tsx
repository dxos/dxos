//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { Icon, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { Accordion, Empty, Listbox } from '@dxos/react-ui-list';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { meta } from '#meta';
import { Routine } from '#types';

import { type RoutineRun, type RunStatus } from './runs';
import { useRoutineRuns } from './useRoutineRuns';

export type RoutineTraceCompanionProps = {
  role?: string;
  subject: Routine.Routine;
};

const STATUS_ICONS: Record<RunStatus, string> = {
  success: 'ph--check-circle--regular',
  failure: 'ph--x-circle--regular',
  pending: 'ph--clock--regular',
};

const STATUS_CLASSES: Record<RunStatus, string> = {
  success: 'text-success-text',
  failure: 'text-error-text',
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

/** Companion panel showing the execution trace (runs) of a Routine. */
export const RoutineTraceCompanion = ({ role, subject }: RoutineTraceCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(subject);
  const runs = useRoutineRuns(db, subject);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            {runs.length === 0 ? (
              <Empty label={t('history.empty.message')} />
            ) : (
              <Accordion.Root<RoutineRun> items={runs} getId={getRunId}>
                {({ items }) => (
                  <div className='flex flex-col'>
                    {items.map((run) => (
                      <Accordion.Item key={run.pid} item={run} classNames='border-b border-subdued-separator'>
                        <Accordion.ItemHeader hover>
                          <Listbox.ItemContent
                            icon={
                              <Icon icon={STATUS_ICONS[run.status]} size={5} classNames={STATUS_CLASSES[run.status]} />
                            }
                            title={formatTimestamp(run.startedAt)}
                            description={`${t(`history.status.${run.status}.label`)} · ${formatDuration(run.duration)}`}
                          />
                        </Accordion.ItemHeader>
                        {/* Match `ItemContent`'s rail/content grid so the JSON aligns under the title column. */}
                        <Accordion.ItemBody classNames='grid grid-cols-[var(--dx-rail-item)_1fr] gap-x-2'>
                          <JsonHighlighter
                            data={toJsonData(run)}
                            classNames='col-start-2 [&_pre]:!text-xs [&_code]:!text-xs'
                          />
                        </Accordion.ItemBody>
                      </Accordion.Item>
                    ))}
                  </div>
                )}
              </Accordion.Root>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
