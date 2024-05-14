//
// Copyright 2024 DXOS.org
//

import { ArrowClockwise, ChartBar } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { Button } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { DatabasePanel, TimeSeries, MemoryPanel, PerformancePanel, QueriesPanel, SpansPanel } from './panels';
import { Panel, type PanelProps } from './util';
import { type Stats } from '../../hooks';

export type QueryPanelProps = {
  stats?: Stats;
  onRefresh?: () => void;
};

// TODO(burdon): Factor out (for Composer).
// TODO(burdon): Reconcile with TraceView in diagnostics.
export const StatsPanel = ({ stats, onRefresh }: QueryPanelProps) => {
  const spans = [...(stats?.diagnostics?.spans ?? [])];
  spans.reverse();

  const queries = [...(stats?.queries ?? [])];
  queries.reverse();

  // TODO(burdon): Store in local storage.
  const [panelState, setPanelState] = useState<Record<string, boolean>>({});
  const handleToggle: PanelProps['onToggle'] = (id, open) => {
    setPanelState({ ...panelState, [id]: open });
  };

  return (
    <div className='flex flex-col w-full h-full bg-neutral-50 divide-y divide-neutral-200 border-neutral-200'>
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
