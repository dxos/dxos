//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { Obj } from '@dxos/echo';
import { Icon, List, ListItem, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { meta } from '#meta';
import { Routine } from '#types';

import { type RoutineRun, type RunStatus } from './runs';
import { useRoutineRuns } from './useRoutineRuns';

export type RoutineRunsProps = {
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

const RunTile: MosaicStackTileComponent<RoutineRun> = ({ data: run }) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <ListItem.Root collapsible classNames='block px-2'>
      <div className='flex items-center'>
        <ListItem.Endcap>
          <Icon icon={STATUS_ICONS[run.status]} size={5} classNames={STATUS_CLASSES[run.status]} />
        </ListItem.Endcap>
        <ListItem.Heading classNames='flex flex-col items-start grow truncate'>
          <div className='truncate'>{formatTimestamp(run.startedAt)}</div>
          <div className='text-description text-sm truncate'>
            {t(`history.status.${run.status}.label`)} · {formatDuration(run.duration)}
          </div>
        </ListItem.Heading>
        <ListItem.OpenTrigger />
      </div>
      <ListItem.CollapsibleContent>
        <JsonHighlighter data={toJsonData(run)} />
      </ListItem.CollapsibleContent>
    </ListItem.Root>
  );
};

/** Companion panel showing the execution runs of a Routine. */
export const RoutineRuns = ({ role, subject }: RoutineRunsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(subject);
  const runs = useRoutineRuns(db, subject);

  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Mosaic.Container asChild orientation='vertical' eventHandler={{ id: 'routine-runs', canDrop: () => false }}>
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport ref={setViewport}>
              {runs.length === 0 ? (
                <Empty label={t('history.empty.message')} />
              ) : (
                <List classNames='dx-document'>
                  <Mosaic.VirtualStack
                    items={runs}
                    getId={getRunId}
                    Tile={RunTile}
                    draggable={false}
                    getScrollElement={() => viewport}
                    estimateSize={() => 48}
                  />
                </List>
              )}
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Panel.Content>
    </Panel.Root>
  );
};
