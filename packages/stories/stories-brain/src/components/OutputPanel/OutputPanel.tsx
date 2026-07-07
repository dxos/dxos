//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useMemo, useState } from 'react';

import { type RDF } from '@dxos/pipeline-rdf';
import { Button, Panel, ScrollArea, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';

import { type EchoObjectItem, EchoObjectsList } from '../EchoObjectsList';
import { FactPanel } from '../FactPanel';

/** A single named metric shown in the Stats tab. */
export type StatItem = { label: string; value: string | number };

/** A pipeline-specific output view (e.g. email messages, threads, transcript) shown as its own tab. */
export type OutputDetail = { id: string; label: string; content: ReactNode };

export type OutputPanelProps = ThemedClassName<{
  facts: RDF.Fact[];
  objects: EchoObjectItem[];
  /** Common per-pipeline metrics (Stats tab). */
  stats?: StatItem[];
  /** Pipeline-specific views appended as extra tabs (messages, threads, transcript, …). */
  details?: OutputDetail[];
}>;

/**
 * Output column: a toolbar of button tabs selecting the view — the {@link FactPanel} (facts +
 * entities + predicates), the {@link EchoObjectsList} of materialized ECHO objects, a Stats tab of
 * per-pipeline metrics, and any pipeline-specific detail views (messages / threads / transcript).
 */
export const OutputPanel = ({ classNames, facts, objects, stats = [], details = [] }: OutputPanelProps) => {
  const tabs = useMemo(() => ['facts', 'objects', 'stats', ...details.map((detail) => detail.id)], [details]);
  const [tab, setTab] = useState<string>('facts');
  // Fall back to a valid tab when the active one disappears (pipeline switch drops its detail views).
  const active = tabs.includes(tab) ? tab : 'facts';

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Button variant={active === 'facts' ? 'primary' : 'ghost'} onClick={() => setTab('facts')}>
            Facts
          </Button>
          <Button variant={active === 'objects' ? 'primary' : 'ghost'} onClick={() => setTab('objects')}>
            Objects
          </Button>
          <Button variant={active === 'stats' ? 'primary' : 'ghost'} onClick={() => setTab('stats')}>
            Stats
          </Button>
          {details.map((detail) => (
            <Button
              key={detail.id}
              variant={active === detail.id ? 'primary' : 'ghost'}
              onClick={() => setTab(detail.id)}
            >
              {detail.label}
            </Button>
          ))}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='min-h-0'>
        {active === 'facts' && <FactPanel facts={facts} classNames='h-full' />}
        {active === 'objects' && <EchoObjectsList objects={objects} classNames='h-full' />}
        {active === 'stats' && <StatsView stats={stats} />}
        {details.map((detail) =>
          active === detail.id ? <React.Fragment key={detail.id}>{detail.content}</React.Fragment> : null,
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

const StatsView = ({ stats }: { stats: StatItem[] }) => (
  <ScrollArea.Root padding classNames='h-full'>
    <ScrollArea.Viewport classNames='flex flex-col gap-1 py-1'>
      {stats.length === 0 && <Empty label='No stats.' />}
      {stats.map((stat) => (
        <div
          key={stat.label}
          className='flex items-center justify-between gap-2 border-b border-subdued-separator py-1'
        >
          <span className='text-sm text-description truncate'>{stat.label}</span>
          <span className='font-medium tabular-nums'>{stat.value}</span>
        </div>
      ))}
    </ScrollArea.Viewport>
  </ScrollArea.Root>
);
