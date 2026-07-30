//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { getSyncSummary, useFeedSyncState, useSyncState } from '@dxos/react-client/echo';
import { Icon, ScrollArea, Toggle } from '@dxos/react-ui';
import { Accordion } from '@dxos/react-ui-list';

import { type Stats, removeEmpty } from '../../hooks';
import { Panel } from './Panel';
import {
  DatabasePanel,
  EdgePanel,
  MemoryPanel,
  NetworkPanel,
  PerformancePanel,
  QueriesPanel,
  RawQueriesPanel,
  ReplicatorMessagesPanel,
  ReplicatorPanel,
  SurfaceProfilerPanel,
  type SurfaceProfilerStats,
  SyncStatusPanel,
} from './panels';

const LOCAL_STORAGE_KEY = 'org.dxos.plugin.debug.panels';

// Every collapsible panel must be listed: the accordion is controlled from this set, so an id
// missing here would reopen-then-snap-shut on click.
const PANEL_KEYS = [
  'ts',
  'performance',
  'surfaceProfiler',
  'edge',
  'network',
  'queries',
  'rawQueries',
  'database',
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

  const queries = [...(stats?.queries ?? [])];
  queries.reverse();

  const syncState = useSyncState();
  const syncSummary = getSyncSummary(syncState);
  const feedSyncState = useFeedSyncState();

  // Store in local storage.
  const [panelState, setPanelState] = useState<Record<PanelKey, boolean | undefined>>(() =>
    PANEL_KEYS.reduce<PanelMap>((acc, key) => {
      acc[key] = localStorage?.getItem(`${LOCAL_STORAGE_KEY}/${key}`) === 'true';
      return acc;
    }, {} as PanelMap),
  );

  // The accordion owns open state as the set of open ids; mirror it back into the persisted map.
  const openPanels = useMemo(() => PANEL_KEYS.filter((key) => panelState[key]), [panelState]);

  const handleValueChange = useCallback((open: string[]) => {
    setPanelState(
      PANEL_KEYS.reduce<PanelMap>((acc, key) => {
        const isOpen = open.includes(key);
        acc[key] = isOpen;
        localStorage?.setItem(`${LOCAL_STORAGE_KEY}/${key}`, String(isOpen));
        return acc;
      }, {} as PanelMap),
    );
  }, []);

  return (
    <ScrollArea.Root thin>
      <ScrollArea.Viewport>
        <Accordion.Root classNames='divide-y divide-separator' value={openPanels} onValueChange={handleValueChange}>
          {() => (
            <>
              <Panel
                id='main'
                icon='ph--chart-bar--regular'
                title='Stats'
                action={
                  <Toggle pressed={live} classNames='p-0 bg-transparent' value='ghost' onClick={handleToggleLive}>
                    <Icon icon={live ? 'ph--pause--regular' : 'ph--play--regular'} />
                  </Toggle>
                }
              />
              <MemoryPanel id='memory' memory={stats?.memory} />
              <NetworkPanel id='network' network={stats?.network} />
              <EdgePanel id='edge' edge={stats?.edge} />
              <PerformancePanel id='performance' entries={stats?.performanceEntries} />
              <SurfaceProfilerPanel
                id='surfaceProfiler'
                stats={surfaceProfilerStats}
                onClear={onClearSurfaceProfiler}
              />
              <DatabasePanel id='database' database={stats?.database} />
              <ReplicatorPanel id='replicator' database={stats?.database} />
              <ReplicatorMessagesPanel id='replicatorMessages' database={stats?.database} />
              <QueriesPanel id='queries' queries={queries} />
              <RawQueriesPanel id='rawQueries' queries={rawQueries} />
              <SyncStatusPanel id='sync' state={syncState} summary={syncSummary} feedState={feedSyncState} debug />
              {children}
            </>
          )}
        </Accordion.Root>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
