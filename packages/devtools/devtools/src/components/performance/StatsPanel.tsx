//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Icon, Toggle } from '@dxos/react-ui';

import { Panel, type PanelProps } from './Panel';
import {
  DatabasePanel,
  MemoryPanel,
  NetworkPanel,
  PerformancePanel,
  QueriesPanel,
  RawQueriesPanel,
  ReplicatorMessagesPanel,
  ReplicatorPanel,
  SpansPanel,
  TimeSeries,
} from './panels';
import { removeEmpty, type Stats } from '../../hooks';

const LOCAL_STORAGE_KEY = 'dxos.org/plugin/performance/panel';

type PanelKey =
  | 'ts'
  | 'performance'
  | 'spans'
  | 'queries'
  | 'rawQueries'
  | 'database'
  | 'memory'
  | 'replicator'
  | 'replicatorMessages';

type PanelMap = Record<PanelKey, boolean | undefined>;

const PANEL_KEYS: PanelKey[] = [
  'ts',
  'performance',
  'spans',
  'queries',
  'rawQueries',
  'database',
  'memory',
  'replicator',
  'replicatorMessages',
];

export type QueryPanelProps = {
  stats?: Stats;
  onRefresh?: () => void;
};

// TODO(burdon): Reconcile with TraceView in diagnostics.
export const StatsPanel = ({ stats, onRefresh }: QueryPanelProps) => {
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

  // Store in local storage.
  const [panelState, setPanelState] = useState<Record<PanelKey, boolean | undefined>>(() =>
    PANEL_KEYS.reduce<PanelMap>((acc, key) => {
      acc[key] = localStorage?.getItem(`${LOCAL_STORAGE_KEY}/${key}`) === 'true';
      return acc;
    }, {} as PanelMap),
  );

  const handleToggle: PanelProps['onToggle'] = (id, open) => {
    setPanelState({ ...panelState, [id]: open });
    localStorage?.setItem(`${LOCAL_STORAGE_KEY}/${id}`, String(open));
  };

  // TODO(burdon): Add Surface debug.
  return (
    <div className='flex flex-col w-full h-full divide-y divide-separator'>
      <Panel
        id='main'
        icon='ph--chart-bar--regular'
        title='Stats'
        info={
          <Toggle
            pressed={live}
            classNames='!bg-transparent !p-0'
            density='fine'
            value='ghost'
            onClick={handleToggleLive}
          >
            <Icon icon={live ? 'ph--pause--regular' : 'ph--play--regular'} size={4} />
          </Toggle>
        }
      />
      <TimeSeries id='ts' open={panelState.ts} onToggle={handleToggle} />
      <PerformancePanel
        id='performance'
        open={panelState.performance}
        onToggle={handleToggle}
        entries={stats?.performanceEntries}
      />
      <SpansPanel id='spans' open={panelState.spans} onToggle={handleToggle} spans={spans} />
      <QueriesPanel id='queries' open={panelState.queries} onToggle={handleToggle} queries={queries} />
      <RawQueriesPanel id='rawQueries' open={panelState.rawQueries} onToggle={handleToggle} queries={rawQueries} />
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
      <MemoryPanel id='memory' memory={stats?.memory} />
      <NetworkPanel id='network' network={stats?.network} />
    </div>
  );
};
