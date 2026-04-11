//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { getSyncSummary, useSyncState } from '@dxos/react-client/echo';
import { Icon, ScrollArea, Toggle } from '@dxos/react-ui';

import { type Stats, removeEmpty } from '../../hooks';
import { Panel } from './Panel';
import {
  DatabasePanel,
  EdgePanel,
  LoggingPanel,
  MemoryPanel,
  NetworkPanel,
  PerformancePanel,
  QueriesPanel,
  RawQueriesPanel,
  ReplicatorMessagesPanel,
  ReplicatorPanel,
  SpansPanel,
  SurfaceProfilerPanel,
  type SurfaceProfilerStats,
  SyncStatusPanel,
  TimeSeries,
} from './panels';

const LOCAL_STORAGE_KEY = 'org.dxos.plugin.debug.panels';

const PANEL_KEYS = [
  'ts',
  'performance',
  'surfaceProfiler',
  'spans',
  'edge',
  'queries',
  'rawQueries',
  'database',
  'logging',
  'memory',
  'replicator',
  'replicatorMessages',
  'sync',
] as const;
type PanelKey = (typeof PANEL_KEYS)[number];
type PanelMap = Record<PanelKey, boolean | undefined>;

export type StatsPanelProps = PropsWithChildren<{
  stats?: Stats;
  surfaceProfilerStats?: SurfaceProfilerStats[];
  onRefresh?: () => void;
  onClearSurfaceProfiler?: () => void;
}>;

// TODO(burdon): Reconcile with TraceView in diagnostics.
export const StatsPanel = ({
  stats,
  surfaceProfilerStats,
  onRefresh,
  onClearSurfaceProfiler,
  children,
}: StatsPanelProps) => {
  const [live, setLive] = useState(false);
  const handleToggleLive = () => setLive((live) => !live);

  useEffect(() => {
    if (live && onRefresh) {
      const interval = setInterval(onRefresh, 5_000);
      return () => clearInterval(interval);
    }
  }, [live, onRefresh]);

  // TODO(burdon): Factor out util.
  const rawQueries = (stats?.queries ?? []).reduce((acc, query) => {
    const raw = removeEmpty(query.filter);
    delete raw.options;
    raw.type = raw.type?.itemId;
    const str = JSON.stringify(raw);
    const num = acc.get(str) ?? 0;
    acc.set(str, num + 1);
    return acc;
  }, new Map<string, number>());

  const spans = [...(stats?.diagnostics?.spans ?? [])];
  spans.reverse();

  const queries = [...(stats?.queries ?? [])];
  queries.reverse();

  const syncState = useSyncState();
  const syncSummary = getSyncSummary(syncState);

  const props = (id: PanelKey) => ({
    id,
    open: panelState[id],
    onToggle: handleToggle,
  });

  // Store in local storage.
  const [panelState, setPanelState] = useState<Record<PanelKey, boolean | undefined>>(() =>
    PANEL_KEYS.reduce<PanelMap>((acc, key) => {
      acc[key] = localStorage?.getItem(`${LOCAL_STORAGE_KEY}/${key}`) === 'true';
      return acc;
    }, {} as PanelMap),
  );

  const handleToggle = useCallback(
    (id: string, open: boolean) => {
      setPanelState({ ...panelState, [id]: open });
      localStorage?.setItem(`${LOCAL_STORAGE_KEY}/${id}`, String(open));
    },
    [panelState],
  );

  return (
    <ScrollArea.Root thin>
      <ScrollArea.Viewport classNames='divide-y divide-separator'>
        <Panel
          id='main'
          icon='ph--chart-bar--regular'
          title='Stats'
          info={
            <Toggle pressed={live} classNames='p-0 bg-transparent' value='ghost' onClick={handleToggleLive}>
              <Icon icon={live ? 'ph--pause--regular' : 'ph--play--regular'} />
            </Toggle>
          }
        />
        <LoggingPanel {...props('logging')} />
        <MemoryPanel id='memory' memory={stats?.memory} />
        <NetworkPanel id='network' network={stats?.network} />
        <EdgePanel id='edge' open={panelState.edge} edge={stats?.edge} onToggle={handleToggle} />
        <PerformancePanel
          id='performance'
          open={panelState.performance}
          onToggle={handleToggle}
          entries={stats?.performanceEntries}
        />
        <SurfaceProfilerPanel
          id='surfaceProfiler'
          open={panelState.surfaceProfiler}
          stats={surfaceProfilerStats}
          onToggle={handleToggle}
          onClear={onClearSurfaceProfiler}
        />
        <DatabasePanel id='database' open={panelState.database} onToggle={handleToggle} database={stats?.database} />
        <ReplicatorPanel
          id='replicator'
          open={panelState.replicator}
          onToggle={handleToggle}
          database={stats?.database}
        />
        <ReplicatorMessagesPanel
          id='replicatorMessages'
          open={panelState.replicatorMessages}
          onToggle={handleToggle}
          database={stats?.database}
        />
        <SpansPanel id='spans' open={panelState.spans} onToggle={handleToggle} spans={spans} />
        <QueriesPanel id='queries' open={panelState.queries} onToggle={handleToggle} queries={queries} />
        <RawQueriesPanel id='rawQueries' open={panelState.rawQueries} onToggle={handleToggle} queries={rawQueries} />
        <SyncStatusPanel
          id='sync'
          open={panelState.sync}
          onToggle={handleToggle}
          state={syncState}
          summary={syncSummary}
          debug
        />
        <TimeSeries id='ts' open={panelState.ts} onToggle={handleToggle} />
        {children}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
