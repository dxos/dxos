//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { type FC, useCallback, useMemo, useState } from 'react';

import { type Database, Filter, type Obj } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { type InvocationSpan } from '@dxos/functions-runtime';
import { TraceEvent } from '@dxos/functions-runtime';
import { DXN } from '@dxos/keys';
import { type SerializedError } from '@dxos/protocols';
import { useQuery } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { DynamicTable, type TableFeatures, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/ui-theme';

import { PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';

import { ExceptionPanel } from './ExceptionPanel';
import { ExecutionGraphPanel } from './ExecutionGraphPanel';
import { useFunctionNameResolver, useInvocationSpans } from './hooks';
import { LogPanel } from './LogPanel';
import { RawDataPanel } from './RawDataPanel';
import { formatDuration } from './utils';

export type InvocationTraceContainerProps = {
  db?: Database.Database;
  queueDxn?: DXN;
  showSpaceSelector?: boolean;
  target?: Obj.Any;
  detailAxis?: 'block' | 'inline';
};

export const InvocationTraceContainer = ({
  db,
  queueDxn,
  detailAxis = 'inline',
  showSpaceSelector = false,
  target,
}: InvocationTraceContainerProps) => {
  const resolver = useFunctionNameResolver({ db });
  const invocationSpans = useInvocationSpans({ queueDxn, target });

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
          name: 'queue',
          title: 'Queue',
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
      const targetDxn =
        invocation.invocationTarget?.dxn ??
        (invocation.invocationTarget && '/' in invocation.invocationTarget
          ? DXN.parse((invocation.invocationTarget as any)['/'])
          : undefined);

      // TODO(burdon): Use InvocationTraceStartEvent.
      return {
        id: invocation.id,
        target: resolver(targetDxn),
        // TODO(burdon): Change to timestamp?
        time: new Date(invocation.timestamp),
        duration: formatDuration(invocation.duration),
        status,
        queue:
          invocation.invocationTraceQueue?.dxn?.toString() ??
          (invocation.invocationTraceQueue && '/' in invocation.invocationTraceQueue
            ? (invocation.invocationTraceQueue as any)['/']
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
          return 'grid grid-cols-[1fr_30rem]';
        case 'block':
          return 'grid grid-rows-[1fr_2fr]';
      }
    }

    return 'grid grid-cols-1';
  }, [selectedInvocation, detailAxis]);

  const features: Partial<TableFeatures> = useMemo(
    () => ({
      selection: { enabled: true, mode: 'single' },
    }),
    [],
  );

  return (
    <PanelContainer
      toolbar={
        showSpaceSelector ? (
          <Toolbar.Root classNames='border-be border-subduedSeparator'>
            <DataSpaceSelector />
          </Toolbar.Root>
        ) : undefined
      }
    >
      <div className={mx('bs-full', gridLayout)}>
        <DynamicTable properties={properties} rows={rows} features={features} onRowClick={handleRowClick} />
        {selectedInvocation && <Selected span={selectedInvocation} />}
      </div>
    </PanelContainer>
  );
};

const Selected: FC<{ span: InvocationSpan }> = ({ span }) => {
  const [activeTab, setActiveTab] = useState('input');

  const queue = span.invocationTraceQueue?.target;
  const objects = useQuery(queue, Filter.everything());

  const contents = Array.head(objects).pipe(
    Option.getOrUndefined,
    Match.value,
    Match.not(Match.defined, () => 'unknown'),
    Match.when(Schema.is(TraceEvent), () => 'logs'),
    Match.orElse(() => 'execution-graph'),
  );

  const isLogQueue = 'logs' === contents || objects.length === 0;

  return (
    <div className='grid grid-cols-1 grid-rows-[min-content_1fr] bs-full min-bs-0 border-separator'>
      <Tabs.Root
        classNames='grid grid-rows-[min-content_1fr] min-bs-0 [&>[role="tabpanel"]]:min-bs-0 [&>[role="tabpanel"][data-state="active"]]:grid border-bs border-separator'
        orientation='horizontal'
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <Tabs.Tablist classNames='border-be border-separator'>
          <Tabs.Tab value='input'>Input</Tabs.Tab>
          {isLogQueue && <Tabs.Tab value='logs'>Logs</Tabs.Tab>}
          {isLogQueue && <Tabs.Tab value='errors'>Error logs</Tabs.Tab>}
          {isLogQueue && <Tabs.Tab value='raw'>Raw</Tabs.Tab>}
          {span.error && <Tabs.Tab value='failure'>Failure</Tabs.Tab>}
          {contents === 'execution-graph' && <Tabs.Tab value='execution-graph'>Execution Graph</Tabs.Tab>}
        </Tabs.Tablist>
        <Tabs.Tabpanel value='input'>
          <SyntaxHighlighter language='json'>{JSON.stringify(span.input, null, 2)}</SyntaxHighlighter>
        </Tabs.Tabpanel>
        {isLogQueue && (
          <Tabs.Tabpanel value='logs'>
            <LogPanel objects={objects} />
          </Tabs.Tabpanel>
        )}
        {isLogQueue && (
          <Tabs.Tabpanel value='errors'>
            <ExceptionPanel objects={objects} />
          </Tabs.Tabpanel>
        )}
        {isLogQueue && (
          <Tabs.Tabpanel value='raw' classNames='min-bs-0 min-is-0 is-full overflow-auto'>
            <RawDataPanel classNames='text-xs' span={span} objects={objects} />
          </Tabs.Tabpanel>
        )}
        {span.error && (
          <Tabs.Tabpanel value='failure'>
            <SpanErrorPanel exception={span.error} />
          </Tabs.Tabpanel>
        )}
        {contents === 'execution-graph' && (
          <Tabs.Tabpanel value='execution-graph'>
            <ExecutionGraphPanel queue={queue} />
          </Tabs.Tabpanel>
        )}
      </Tabs.Root>
    </div>
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
