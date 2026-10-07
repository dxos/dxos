//
// Copyright 2026 DXOS.org
//

import React, { Fragment, type ReactNode, useMemo, useState } from 'react';

import { type RDF } from '@dxos/pipeline-rdf';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';

import { type EchoObjectItem, EchoObjectsList } from '../EchoObjectsList/index.ts';
import { FactPanel } from '../FactPanel/index.ts';

/** A single named metric shown in the Stats tab. */
export type StatItem = { label: string; value: string | number };

/** A pipeline-specific output view (e.g. email messages, threads, transcript) shown as its own tab. */
export type OutputDetail = { id: string; label: string; content: ReactNode };

export type OutputPanelProps = Util.ThemedClassName<{
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
      <Panel.Header>
        <Toolbar.Root>
          <Button.Root variant={active === 'facts' ? 'primary' : 'ghost'} onClick={() => setTab('facts')}>
            Facts
          </Button.Root>
          <Button.Root variant={active === 'objects' ? 'primary' : 'ghost'} onClick={() => setTab('objects')}>
            Objects
          </Button.Root>
          <Button.Root variant={active === 'stats' ? 'primary' : 'ghost'} onClick={() => setTab('stats')}>
            Stats
          </Button.Root>
          {details.map((detail) => (
            <Button.Root
              key={detail.id}
              variant={active === detail.id ? 'primary' : 'ghost'}
              onClick={() => setTab(detail.id)}
            >
              {detail.label}
            </Button.Root>
          ))}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        {active === 'facts' && <FactPanel facts={facts} classNames='h-full' />}
        {active === 'objects' && <EchoObjectsList objects={objects} classNames='h-full' />}
        {active === 'stats' && <StatsView stats={stats} />}
        {details.map((detail) => (active === detail.id ? <Fragment key={detail.id}>{detail.content}</Fragment> : null))}
      </Panel.Body>
    </Panel.Root>
  );
};

const StatsView = ({ stats }: { stats: StatItem[] }) => (
  <ScrollArea.Root classNames='h-full'>
    <ScrollArea.Viewport classNames='flex flex-col gap-1 py-1'>
      {stats.length === 0 && <Status.Empty>No stats.</Status.Empty>}
      {stats.map((stat) => (
        <div key={stat.label} className='flex items-center justify-between gap-2 border-b border-separator-subtle py-1'>
          <span className='text-sm text-fg-muted truncate'>{stat.label}</span>
          <span className='font-medium tabular-nums'>{stat.value}</span>
        </div>
      ))}
    </ScrollArea.Viewport>
  </ScrollArea.Root>
);
