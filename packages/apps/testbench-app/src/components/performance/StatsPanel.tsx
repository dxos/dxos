//
// Copyright 2024 DXOS.org
//

import { ArrowClockwise, ChartBar } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { DatabasePanel, TimeSeries, MemoryPanel, PerformancePanel, QueriesPanel, SpansPanel } from './panels';
import { Panel, type PanelProps } from './util';
import { type Stats } from '../../hooks';

const LOCAL_STORAGE_KEY = 'dxos.org/plugin/performance/panel';

export type QueryPanelProps = {
  stats?: Stats;
  onRefresh?: () => void;
};

type PanelKey = 'ts' | 'performance' | 'spans' | 'queries' | 'database' | 'memory';
type PanelMap = Record<PanelKey, boolean | undefined>;
const PANEL_KEYS: PanelKey[] = ['ts', 'performance', 'spans', 'queries', 'database', 'memory'];

// TODO(burdon): Factor out (for Composer).
// TODO(burdon): Reconcile with TraceView in diagnostics.
export const StatsPanel = ({ stats, onRefresh }: QueryPanelProps) => {
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
    <div
      className={mx(
        'flex flex-col w-full h-full bg-neutral-50 dark:bg-neutral-900',
        'divide-y divide-neutral-200 dark:divide-neutral-700',
      )}
    >
      <Panel
        id='main'
        icon={ChartBar}
        title='Stats'
        info={
          <Button classNames='!bg-transparent !p-0' density='fine' value='ghost' onClick={onRefresh}>
            <ArrowClockwise className={getSize(4)} />
          </Button>
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
      <DatabasePanel id='database' database={stats?.database} />
      <MemoryPanel id='memory' memory={stats?.memory} />
    </div>
  );
};
