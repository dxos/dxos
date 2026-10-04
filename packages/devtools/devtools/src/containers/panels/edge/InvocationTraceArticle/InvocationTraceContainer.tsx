//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { type FC, useCallback, useMemo, useState } from 'react';

import { type InvocationSpan } from '@dxos/compute-runtime';
import { TraceEvent } from '@dxos/compute-runtime';
import { type Database, type Obj, Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { Format } from '@dxos/echo/Format';
import { type URI } from '@dxos/keys';
import { type SerializedError } from '@dxos/protocols';
import { Panel, Tabs, Toolbar, composable, composableProps } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { DynamicTable, type TableFeatures, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { mx } from '@dxos/ui-theme';

import { DataSpaceSelector } from '../../../../containers/index.ts';
import { ExceptionPanel } from './ExceptionPanel.tsx';
import { ExecutionGraphPanel } from './ExecutionGraphPanel.tsx';
import { useFunctionNameResolver, useInvocationSpans } from './hooks.ts';
import { LogPanel } from './LogPanel.tsx';
import { RawDataPanel } from './RawDataPanel.tsx';
import { formatDuration } from './utils.ts';

export type InvocationTraceContainerProps = {
  role?: string;
  db?: Database.Database;
  feedDXN?: URI.URI;
  showSpaceSelector?: boolean;
  target?: Obj.Unknown;
  detailAxis?: 'block' | 'inline';
  /** Overrides hook-provided spans (for testing/storybook). */
  invocationSpans?: InvocationSpan[];
};

export const InvocationTraceContainer = composable<HTMLDivElement, InvocationTraceContainerProps>(
  (
    {
      role,
      db,
      feedDXN,
      detailAxis = 'inline',
      showSpaceSelector = false,
      target,
      invocationSpans: invocationSpansProp,
      ...props
    },
    forwardedRef,
  ) => {
    const resolver = useFunctionNameResolver({ db });
    const hookSpans = useInvocationSpans({ feedDXN, target });
    const invocationSpans = invocationSpansProp ?? hookSpans;

    const [selectedId, setSelectedId] = useState<string>();
    const selectedInvocation = useMemo(() => {
      if (!selectedId) {
        return undefined;
      }

      return invocationSpans.find((span) => selectedId === span.id);
    }, [selectedId, invocationSpans]);

    const properties: TablePropertyDefinition[] = useMemo(() => {
      function* generateProperties() {
        if (target === undefined) {
          yield { name: 'target', title: 'Target', format: Format.TypeFormat.String, size: 200 };
        }

        yield* [
          {
            name: 'time',
            title: 'Started',
            format: Format.TypeFormat.DateTime,
            sort: 'desc' as const,
            size: 194,
          },
          {
            name: 'status',
            title: 'Status',
            format: Format.TypeFormat.SingleSelect,
            size: 110,
            config: {
              options: [
                { id: 'pending', title: 'Pending', color: 'blue' },
                { id: 'success', title: 'Success', color: 'emerald' },
                { id: 'failure', title: 'Failure', color: 'red' },
                { id: 'unknown', title: 'Unknown', color: 'neutral' },
              ],
            },
          },
          {
            name: 'duration',
            title: 'Duration',
            format: Format.TypeFormat.Duration,
            size: 110,
          },
          {
            name: 'feed',
            title: 'Feed',
            format: Format.TypeFormat.String,
            // TODO(burdon): Add formatter.
            // formatter: (value: string) => value.split(':').pop(),
            size: 400,
          },
        ];
      }

      return [...generateProperties()];
    }, [target]);

    const rows = useMemo(() => {
      return invocationSpans.map((invocation) => {
        const status = invocation.outcome;
        // Handle both Ref objects and encoded references.
        const targetDXN: URI.URI | undefined =
          invocation.invocationTarget?.uri ??
          (EncodedReference.isEncodedReference(invocation.invocationTarget)
            ? EncodedReference.toURI(invocation.invocationTarget)
            : undefined);

        // TODO(burdon): Use InvocationTraceStartEvent.
        return {
          id: invocation.id,
          target: resolver(targetDXN),
          // TODO(burdon): Change to timestamp?
          time: new Date(invocation.timestamp),
          duration: formatDuration(invocation.duration),
          status,
          feed:
            invocation.invocationTraceFeed?.uri ??
            (EncodedReference.isEncodedReference(invocation.invocationTraceFeed)
              ? EncodedReference.toURI(invocation.invocationTraceFeed)
              : 'unknown'),
          _original: invocation,
        };
      });
    }, [invocationSpans, resolver]);

    const handleRowClick = useCallback((row: any) => {
      if (!row) {
        return;
      }
      setSelectedId(row.id);
    }, []);

    const gridLayout = useMemo(() => {
      if (selectedInvocation) {
        switch (detailAxis) {
          case 'inline':
            return 'grid grid-cols-[minmax(0,1fr)_30rem] grid-rows-[minmax(0,1fr)]';
          case 'block':
            return 'grid grid-rows-[minmax(0,1fr)_minmax(0,2fr)]';
        }
      }

      return 'grid grid-cols-1 grid-rows-[minmax(0,1fr)]';
    }, [selectedInvocation, detailAxis]);

    const features: Partial<TableFeatures> = useMemo(
      () => ({
        selection: { enabled: true, mode: 'single' },
      }),
      [],
    );

    return (
      <div {...composableProps(props, { classNames: ['h-full'] })} ref={forwardedRef}>
        <Panel.Root role={role}>
          {showSpaceSelector && (
            <Panel.Header>
              <Toolbar.Root classNames='border-b border-separator-subtle'>
                <DataSpaceSelector />
              </Toolbar.Root>
            </Panel.Header>
          )}
          <Panel.Body>
            <div className='relative dx-grow'>
              <div className={mx('dx-cover overflow-hidden', gridLayout)}>
                <DynamicTable properties={properties} rows={rows} features={features} onRowClick={handleRowClick} />
                {selectedInvocation && <Selected span={selectedInvocation} />}
              </div>
            </div>
          </Panel.Body>
        </Panel.Root>
      </div>
    );
  },
);

const Selected: FC<{ span: InvocationSpan }> = ({ span }) => {
  const [activeTab, setActiveTab] = useState('input');

  // TODO(dmaretskyi): Per-invocation trace event feeds are deprecated; the
  // log/exception/execution-graph panels render an empty snapshot until a
  // replacement tracing data structure lands.
  const objects: TraceEvent[] = [];

  const contents = Array.head(objects).pipe(
    Option.getOrUndefined,
    Match.value,
    Match.not(Match.defined, () => 'unknown'),
    Match.when(Schema.is(Type.getSchema(TraceEvent)), () => 'logs'),
    Match.orElse(() => 'execution-graph'),
  );

  const isLogQueue = 'logs' === contents || objects.length === 0;

  return (
    <Tabs.Root asChild orientation='horizontal' value={activeTab} onValueChange={setActiveTab}>
      <div className='grid grid-cols-1 grid-rows-[min-content_1fr] overflow-hidden border-separator [&>[role="tabpanel"]]:min-h-0 [&>[role="tabpanel"][data-state="active"]]:grid border-t border-separator'>
        <Tabs.List classNames='border-b border-separator'>
          <Tabs.Trigger value='input'>Input</Tabs.Trigger>
          {isLogQueue && <Tabs.Trigger value='logs'>Logs</Tabs.Trigger>}
          {isLogQueue && <Tabs.Trigger value='errors'>Error logs</Tabs.Trigger>}
          {isLogQueue && <Tabs.Trigger value='raw'>Raw</Tabs.Trigger>}
          {span.error && <Tabs.Trigger value='failure'>Failure</Tabs.Trigger>}
          {contents === 'execution-graph' && <Tabs.Trigger value='execution-graph'>Execution Graph</Tabs.Trigger>}
        </Tabs.List>
        <Tabs.Content value='input' classNames='w-full overflow-auto'>
          <JsonHighlighter data={span.input} />
        </Tabs.Content>
        {isLogQueue && (
          <Tabs.Content value='logs'>
            <LogPanel objects={objects} />
          </Tabs.Content>
        )}
        {isLogQueue && (
          <Tabs.Content value='errors'>
            <ExceptionPanel objects={objects} />
          </Tabs.Content>
        )}
        {isLogQueue && (
          <Tabs.Content value='raw' classNames='w-full overflow-auto'>
            <RawDataPanel classNames='text-xs' span={span} objects={objects} />
          </Tabs.Content>
        )}
        {span.error && (
          <Tabs.Content value='failure'>
            <SpanErrorPanel exception={span.error} />
          </Tabs.Content>
        )}
        {contents === 'execution-graph' && (
          <Tabs.Content value='execution-graph'>
            <ExecutionGraphPanel objects={objects} />
          </Tabs.Content>
        )}
      </div>
    </Tabs.Root>
  );
};

const SpanErrorPanel = ({ exception }: { exception: SerializedError }) => {
  return (
    <div className='text-xs whitespace-pre-wrap m-4'>
      <div>Code: {exception.name}</div>
      <div>Message: {exception.message}</div>
      <div />
      <div>Stack: {exception.stack}</div>
      <div />
      {exception.cause && (
        <>
          <div>Caused by:</div>
          <SpanErrorPanel exception={exception.cause} />
        </>
      )}
    </div>
  );
};

export default InvocationTraceContainer;
