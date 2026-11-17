//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { type RDF } from '@dxos/pipeline-rdf';
import { Scene2DView } from '@dxos/react-ui-canvas';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { BrainCapabilities } from '#types';

import { type FactStoreRegistry } from '../../capabilities/fact-store.ts';
import { BrainNamespace } from '../../namespace.ts';
import { TOP_SOURCES, count, elapsed, modelName, moment, totals, usd } from './pipeline-diagram.ts';
import { pipelineDocument, readPipelines } from './pipeline.ts';

/**
 * The pipeline that filled the space's memory, as its memory records it: a diagram of its sources, stages, models and
 * output drawn on a read-only canvas, then its counters, cost and time, and its busiest channels with their first and last
 * message and the cursor reading stopped at.
 */
export const PipelineCompanion = () => {
  const registry = Hooks.useCapability(BrainCapabilities.FactStoreRegistry);
  const space = ToolkitHooks.useActiveSpace();
  return space ? <PipelinePanel registry={registry} spaceId={space.id} /> : null;
};

PipelineCompanion.displayName = 'PipelineCompanion';

const PipelinePanel = ({ registry, spaceId }: { registry: FactStoreRegistry; spaceId: string }) => {
  const { t } = UiHooks.useTranslation(BrainNamespace.key);
  const [pipelines, setPipelines] = useState<readonly RDF.Pipeline.State[]>([]);
  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      void readPipelines(registry.forSpace(spaceId)).then((states) => !cancelled && setPipelines(states));
    refresh();
    const unsubscribe = registry.subscribe(spaceId, refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [registry, spaceId]);

  const [state] = pipelines;
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>{state ? `${state.name} · ${state.status}` : t('pipeline-none.message')}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='min-h-0'>
        {state && (
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              <PipelineView state={state} />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

const PipelineView = ({ state }: { state: RDF.Pipeline.State }) => {
  const { t } = UiHooks.useTranslation(BrainNamespace.key);
  const document = useMemo(() => pipelineDocument(state), [state]);

  const sum = totals(state);
  const stages = [...state.stages].sort((left, right) => left.order - right.order);
  const busiest = [...state.sources].sort((left, right) => right.items - left.items).slice(0, TOP_SOURCES);
  const rows: [string, string][] = [
    [t('pipeline-time.label'), `${moment(state.startedAt)} → ${moment(state.endedAt)} UTC`],
    [t('pipeline-duration.label'), elapsed(state.startedAt, state.endedAt) ?? '–'],
    [t('pipeline-messages.label'), `${count(sum.items)} · ${count(sum.sources)} channels`],
    [t('pipeline-first.label'), moment(sum.first)],
    [t('pipeline-last.label'), moment(sum.last)],
    [t('pipeline-facts.label'), state.facts !== undefined ? count(state.facts) : '–'],
    [t('pipeline-calls.label'), `${count(sum.calls)} · ${count(sum.tokens)} tokens`],
    [t('pipeline-cost.label'), sum.costUsd !== undefined ? usd(sum.costUsd) : '–'],
  ];

  return (
    <div className='flex flex-col gap-3 p-2' data-testid='brain.pipeline'>
      <div className='h-[26rem] rounded-sm overflow-hidden' data-testid='brain.pipeline.diagram'>
        <Scene2DView document={document} theme='flat' camera='fit' margin={0.04} grid={false} />
      </div>
      <Table head={[t('pipeline-run.label'), '']} rows={rows} />
      <Table
        head={[
          t('pipeline-stage.label'),
          t('pipeline-model.label'),
          t('pipeline-calls.label'),
          t('pipeline-cost.label'),
        ]}
        rows={stages.flatMap((stage) =>
          stage.models.length === 0
            ? [[stage.label, '–', '–', '–']]
            : stage.models.map((usage) => [
                stage.label,
                modelName(usage.model),
                count(usage.calls),
                usage.costUsd !== undefined ? usd(usage.costUsd) : '–',
              ]),
        )}
      />
      <Table
        head={[
          t('pipeline-channel.label'),
          t('pipeline-messages.label'),
          t('pipeline-first.label'),
          t('pipeline-last.label'),
          t('pipeline-cursor.label'),
        ]}
        rows={busiest.map((source) => [
          source.label ?? source.id,
          count(source.items),
          moment(source.firstItemAt),
          moment(source.lastItemAt),
          source.cursor ?? '–',
        ])}
      />
    </div>
  );
};

const Table = ({ head, rows }: { head: readonly string[]; rows: readonly (readonly string[])[] }) => (
  <table className='text-sm border-collapse w-full'>
    <thead>
      <tr>
        {head.map((cell, index) => (
          <th key={index} className='text-start font-medium px-2 py-1 border-b border-separator'>
            {cell}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, index) => (
        <tr key={index}>
          {row.map((cell, column) => (
            <td key={column} className='px-2 py-1 align-top border-b border-separator max-w-[16rem] truncate'>
              {cell}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
