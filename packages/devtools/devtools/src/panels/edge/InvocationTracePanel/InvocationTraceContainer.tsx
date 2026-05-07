//
// Copyright 2025 DXOS.org
//

import React, { type FC, useCallback, useMemo, useState } from 'react';

import { Trace } from '@dxos/compute';
import { type Database, type Obj } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { DynamicTable, type TableFeatures, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { Tabs } from '@dxos/react-ui-tabs';
import { composable, composableProps, mx } from '@dxos/ui-theme';

import { PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { ExceptionPanel } from './ExceptionPanel';
import { type InvocationSpan, useFunctionNameResolver, useInvocationMessages, useInvocationSpans } from './hooks';
import { LogPanel } from './LogPanel';
import { RawDataPanel } from './RawDataPanel';
import { formatDuration } from './utils';

export type InvocationTraceContainerProps = {
  db?: Database.Database;
  showSpaceSelector?: boolean;
  target?: Obj.Unknown;
  detailAxis?: 'block' | 'inline';
  /** Overrides hook-provided spans (for testing/storybook). */
  invocationSpans?: InvocationSpan[];
};

export const InvocationTraceContainer = composable<HTMLDivElement, InvocationTraceContainerProps>(
  (
    {
      classNames,
      db,
      detailAxis = 'inline',
      showSpaceSelector = false,
      target,
      invocationSpans: invocationSpansProp,
      ...props
    },
    forwardedRef,
  ) => {
    const resolver = useFunctionNameResolver({ db });
    const hookSpans = useInvocationSpans({ db, target });
    const invocationSpans = invocationSpansProp ?? hookSpans;

    const [selectedId, setSelectedId] = useState<string>();
    const selectedInvocation = useMemo(() => {
      if (!selectedId) {
        return undefined;
      }

      return invocationSpans.find((span) => selectedId === span.pid);
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
            name: 'pid',
            title: 'PID',
            format: Format.TypeFormat.String,
            size: 200,
          },
        ];
      }

      return [...generateProperties()];
    }, [target]);

    const rows = useMemo(() => {
      return invocationSpans.map((invocation) => {
        const status = invocation.outcome ?? 'pending';
        const targetLabel = invocation.name ?? (invocation.key ? resolver(invocation.key) : undefined);
        return {
          id: invocation.pid,
          target: targetLabel ?? invocation.key ?? invocation.pid,
          time: new Date(invocation.timestamp),
          duration: formatDuration(invocation.duration),
          status,
          pid: invocation.pid,
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
      <div {...composableProps(props, { classNames: ['h-full', classNames] })} ref={forwardedRef}>
        <PanelContainer
          toolbar={
            showSpaceSelector ? (
              <Toolbar.Root classNames='border-b border-subdued-separator'>
                <DataSpaceSelector />
              </Toolbar.Root>
            ) : undefined
          }
        >
          <div className='relative flex-1 min-h-0'>
            <div className={mx('absolute inset-0 overflow-hidden', gridLayout)}>
              <DynamicTable properties={properties} rows={rows} features={features} onRowClick={handleRowClick} />
              {selectedInvocation && <Selected db={db} span={selectedInvocation} />}
            </div>
          </div>
        </PanelContainer>
      </div>
    );
  },
);

const Selected: FC<{ db?: Database.Database; span: InvocationSpan }> = ({ db, span }) => {
  const [activeTab, setActiveTab] = useState('input');

  const messages = useInvocationMessages({ db, pid: span.pid });
  const hasLogs = useMemo(
    () => messages.some((m: Trace.Message) => m.events.some((e: Trace.Event) => Trace.isOfType(Trace.Log, e))),
    [messages],
  );
  const hasExceptions = useMemo(
    () => messages.some((m: Trace.Message) => m.events.some((e: Trace.Event) => Trace.isOfType(Trace.Exception, e))),
    [messages],
  );

  return (
    <div className='grid grid-cols-1 grid-rows-[min-content_1fr] min-h-0 overflow-hidden border-separator'>
      <Tabs.Root
        classNames='grid grid-rows-[min-content_1fr] min-h-0 [&>[role="tabpanel"]]:min-h-0 [&>[role="tabpanel"][data-state="active"]]:grid border-t border-separator'
        orientation='horizontal'
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <Tabs.Tablist classNames='border-b border-separator'>
          <Tabs.Tab value='input'>Input</Tabs.Tab>
          {hasLogs && <Tabs.Tab value='logs'>Logs</Tabs.Tab>}
          {hasExceptions && <Tabs.Tab value='exceptions'>Exceptions</Tabs.Tab>}
          <Tabs.Tab value='raw'>Raw</Tabs.Tab>
          {span.error && <Tabs.Tab value='failure'>Failure</Tabs.Tab>}
        </Tabs.Tablist>
        <Tabs.Panel value='input' classNames='min-h-0 min-w-0 w-full overflow-auto'>
          <JsonHighlighter data={span.input} />
        </Tabs.Panel>
        {hasLogs && (
          <Tabs.Panel value='logs'>
            <LogPanel messages={messages} />
          </Tabs.Panel>
        )}
        {hasExceptions && (
          <Tabs.Panel value='exceptions'>
            <ExceptionPanel messages={messages} />
          </Tabs.Panel>
        )}
        <Tabs.Panel value='raw' classNames='min-h-0 min-w-0 w-full overflow-auto'>
          <RawDataPanel classNames='text-xs' span={span} messages={messages} />
        </Tabs.Panel>
        {span.error && (
          <Tabs.Panel value='failure'>
            <SpanErrorPanel error={span.error} />
          </Tabs.Panel>
        )}
      </Tabs.Root>
    </div>
  );
};

const SpanErrorPanel: FC<{ error: string }> = ({ error }) => {
  return (
    <div className='text-xs whitespace-pre-wrap m-4'>
      <div>Message: {error}</div>
    </div>
  );
};

export default InvocationTraceContainer;
