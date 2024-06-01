//
// Copyright 2024 DXOS.org
//

import { ChartBar, Pause, Play } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { DensityProvider, Toggle } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { Panel, type PanelProps } from './Panel';
import {
  DatabasePanel,
  MemoryPanel,
  PerformancePanel,
  QueriesPanel,
  RawQueriesPanel,
  SpansPanel,
  TimeSeries,
} from './panels';
import { removeEmpty, type Stats } from '../../hooks';
import { styles } from '../../styles';

const LOCAL_STORAGE_KEY = 'dxos.org/plugin/performance/panel';

export type QueryPanelProps = {
  stats?: Stats;
  onRefresh?: () => void;
};

type PanelKey = 'ts' | 'performance' | 'spans' | 'queries' | 'rawQueries' | 'database' | 'memory';
type PanelMap = Record<PanelKey, boolean | undefined>;

const PANEL_KEYS: PanelKey[] = ['ts', 'performance', 'spans', 'queries', 'rawQueries', 'database', 'memory'];

// TODO(burdon): Reconcile with TraceView in diagnostics.
export const StatsPanel = ({ stats, onRefresh }: QueryPanelProps) => {
  const [live, setLive] = useState(true);
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
      acc[key] = localStorage.getItem(`${LOCAL_STORAGE_KEY}/${key}`) !== 'false';
      return acc;
    }, {} as PanelMap),
  );

  const handleToggle: PanelProps['onToggle'] = (id, open) => {
    setPanelState({ ...panelState, [id]: open });
    localStorage.setItem(`${LOCAL_STORAGE_KEY}/${id}`, String(open));
  };

  return (
    <DensityProvider density='fine'>
      <div className={mx('flex flex-col w-full h-full divide-y', styles.border)}>
        <Panel
          id='main'
          icon={ChartBar}
          title='Stats'
          info={
            <Toggle
              pressed={live}
              classNames='!bg-transparent !p-0'
              density='fine'
              value='ghost'
              onClick={handleToggleLive}
            >
              {live ? <Pause className={getSize(4)} /> : <Play className={getSize(4)} />}
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
        <DatabasePanel id='database' database={stats?.database} />
        <MemoryPanel id='memory' memory={stats?.memory} />
      </div>
    </DensityProvider>
  );
};
