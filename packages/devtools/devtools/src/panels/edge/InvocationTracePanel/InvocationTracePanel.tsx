//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState, useMemo, useCallback } from 'react';

import { decodeReference } from '@dxos/echo-protocol';
import { FormatEnum } from '@dxos/echo-schema';
import {
  type TraceEvent,
  type InvocationTraceEvent,
  type InvocationSpan,
  createInvocationSpans,
  InvocationOutcome,
} from '@dxos/functions/types';
import { useQueue, type Space } from '@dxos/react-client/echo';
import { Tag, Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/react-ui-theme';

import { ControlledSelector, PanelContainer, Placeholder } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

export const InvocationTracePanel = (props: { space?: Space }) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
  const invocationsQueue = useQueue<InvocationTraceEvent>(space?.properties.invocationTraceQueue?.dxn);
  const [selectedInvocation, setSelectedInvocation] = useState<InvocationSpan>();

  const invocationSpans = useMemo(
    () => createInvocationSpans(invocationsQueue?.items),
    [invocationsQueue?.items ?? []],
  );
  const invocationsByTarget = groupByInvocationTarget(invocationSpans);
  const [selectedTarget, setSelectedTarget] = useState<string>();

  useEffect(() => {
    if (selectedTarget && !invocationsByTarget.has(selectedTarget)) {
      setSelectedTarget(undefined);
    } else if (!selectedTarget && invocationsByTarget.size) {
      setSelectedTarget([...invocationsByTarget.keys()][0]);
    }
  }, [invocationsByTarget ?? null]);

  const invocationProperties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'time', title: 'Time', format: FormatEnum.String, sort: 'desc' as const },
      {
        name: 'outcome',
        title: 'Outcome',
        format: FormatEnum.SingleSelect,
        size: 140,
        config: {
          options: [
            { id: 'success', title: 'Success', color: 'green' },
            { id: 'failure', title: 'Failure', color: 'red' },
            { id: 'unknown', title: 'Unknown', color: 'neutral' },
          ],
        },
      },
      { name: 'queue', title: 'Queue', format: FormatEnum.String },
    ],
    [],
  );

  const invocationData = useMemo(() => {
    return filterBySelected(invocationSpans, selectedTarget).map((item) => {
      const outcomeValue = (() => {
        switch (item.outcome) {
          case 'success':
            return 'success';
          case 'failure':
            return 'failure';
          default:
            // Log unknown outcome values.
            console.log(`Unknown outcome value: ${item.outcome}`);
            return 'unknown';
        }
      })();

      return {
        id: `${item.timestampMs}-${Math.random()}`,
        time: new Date(item.timestampMs).toLocaleString(),
        outcome: outcomeValue,
        queue: decodeReference(item.invocationTraceQueue).dxn?.toString() ?? 'unknown',
        _original: item,
      };
    });
  }, [invocationsQueue?.items, selectedTarget]);

  const handleInvocationRowClicked = useCallback((row: any) => {
    if (!row) {
      return;
    }
    const invocation = row._original;
    setSelectedInvocation(invocation);
  }, []);

  const [activeTab, setActiveTab] = useState('logs');

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          {!props.space && <DataSpaceSelector />}
          <ControlledSelector
            placeholder={'Invocation target'}
            values={[...invocationsByTarget.keys()]}
            value={selectedTarget ?? ''}
            setValue={setSelectedTarget}
          />
        </Toolbar.Root>
      }
    >
      <div className={mx('bs-full grid grid-cols-[1fr_24rem]')}>
        <div>
          <DynamicTable
            properties={invocationProperties}
            data={invocationData}
            onRowClicked={handleInvocationRowClicked}
          />
        </div>
        <div className='grid grid-cols-1 grid-rows-[min-content_1fr] bs-full min-bs-0 border-is border-bs border-separator'>
          <SpanSummary span={selectedInvocation} />
          <Tabs.Root
            orientation='horizontal'
            value={activeTab}
            onValueChange={setActiveTab}
            classNames='grid grid-rows-[min-content_1fr] min-bs-0 [&>[role="tabpanel"]]:min-bs-0 [&>[role="tabpanel"][data-state="active"]]:grid border-bs border-separator'
          >
            <Tabs.Tablist classNames='border-be border-separator'>
              <Tabs.Tab value='logs'>Logs</Tabs.Tab>
              <Tabs.Tab value='exceptions'>Exceptions</Tabs.Tab>
              <Tabs.Tab value='raw'>Raw</Tabs.Tab>
            </Tabs.Tablist>
            <Tabs.Tabpanel value='logs'>
              <LogPanel span={selectedInvocation} />
            </Tabs.Tabpanel>
            <Tabs.Tabpanel value='exceptions'>
              {selectedInvocation ? (
                <ExceptionPanel span={selectedInvocation} />
              ) : (
                <Placeholder label='Select an invocation to see exceptions' />
              )}
            </Tabs.Tabpanel>
            <Tabs.Tabpanel value='raw' classNames='min-bs-0 min-is-0 is-full overflow-auto'>
              <div className='text-xs'>
                {selectedInvocation ? <RawDataPanel span={selectedInvocation} /> : <Placeholder label='Contents' />}
              </div>
            </Tabs.Tabpanel>
          </Tabs.Root>
        </div>
      </div>
    </PanelContainer>
  );
};

type SpanSummaryProps = { span?: InvocationSpan };

export const SpanSummary: React.FC<SpanSummaryProps> = ({ span }) => {
  if (!span) {
    return <div className={mx('flex items-center justify-center')}>Select an invocation to see details</div>;
  }

  // Extract target name from reference
  const targetDxn = decodeReference(span.invocationTarget).dxn?.toString() ?? 'unknown';
  const targetName = targetDxn.split(':').pop() ?? 'unknown';

  // Format timestamp
  const timestamp = new Date(span.timestampMs).toLocaleString();

  // Format duration
  const duration = `${span.durationMs}ms`;

  // Determine status and outcome styling
  const isRunning = span.outcome === undefined;
  const outcomeColor = (() => {
    if (isRunning) {
      return 'blue';
    }
    return span.outcome === InvocationOutcome.SUCCESS ? 'emerald' : 'red';
  })();

  const outcomeLabel = isRunning ? 'Running' : span.outcome;

  return (
    <div className={mx('p-2 overflow-auto')}>
      <div className={mx('flex justify-between items-start')}>
        <div>
          <h3 className={mx('text-lg font-medium mb-1')}>{targetName}</h3>
          <div className={mx('flex gap-2 items-center')}>
            <Tag color={outcomeColor}>{outcomeLabel}</Tag>
            <span className={mx('text-sm text-neutral')}>{timestamp}</span>
            <span className={mx('text-sm')}>{duration}</span>
          </div>
        </div>

        {span.trigger && (
          <Tag color='amber'>
            Triggered{' '}
            <span className={mx('opacity-80')}>{decodeReference(span.trigger).dxn?.toString().split(':').pop()}</span>
          </Tag>
        )}
      </div>

      {span.exception && (
        <div className={mx('mt-3 p-2 bg-red/10 rounded border border-red/30')}>
          <div className={mx('font-medium text-red')}>
            {span.exception.name}: {span.exception.message}
          </div>
        </div>
      )}

      {Object.keys(span.input).length > 0 && (
        <div className={mx('mt-3')}>
          <details className={mx('text-sm')}>
            <summary className={mx('cursor-pointer font-medium')}>Input Data</summary>
            <pre className={mx('mt-2 p-2 bg-neutral/5 rounded text-xs overflow-auto')}>
              {JSON.stringify(span.input, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

type LogPanelProps = {
  span?: InvocationSpan;
};

export const LogPanel: React.FC<LogPanelProps> = ({ span }) => {
  // Get the trace queue for this invocation
  const traceQueueDxn = useMemo(() => {
    return span?.invocationTraceQueue ? decodeReference(span.invocationTraceQueue).dxn : undefined;
  }, [span?.invocationTraceQueue]);

  // Fetch all trace events from the queue
  const eventQueue = useQueue<TraceEvent>(traceQueueDxn);

  // Define properties for the DynamicTable
  const logProperties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'time', title: 'Time', format: FormatEnum.String, sort: 'desc' as const, size: 200 },
      {
        name: 'level',
        title: 'Level',
        format: FormatEnum.SingleSelect,
        size: 100,
        config: {
          options: [
            { id: 'error', title: 'ERROR', color: 'red' },
            { id: 'warn', title: 'WARN', color: 'amber' },
            { id: 'log', title: 'LOG', color: 'neutral' },
            { id: 'info', title: 'INFO', color: 'blue' },
            { id: 'debug', title: 'DEBUG', color: 'neutral' },
          ],
        },
      },
      { name: 'message', title: 'Message', format: FormatEnum.String },
      { name: 'context', title: 'Context', format: FormatEnum.JSON, size: 500 },
    ],
    [],
  );

  const logData = useMemo(() => {
    if (!eventQueue?.items?.length) {
      return [];
    }

    return eventQueue.items.flatMap((event) => {
      return event.logs.map((log) => ({
        id: `${event.id}-${log.timestampMs}`,
        time: new Date(log.timestampMs).toLocaleString(),
        level: log.level,
        message: log.message,
        context: JSON.stringify(log.context) ?? {},
        _original: { ...log, eventId: event.id },
      }));
    });
  }, [eventQueue?.items]);

  if (!span) {
    return <div className={mx('flex items-center justify-center h-full')}>Select an invocation to see logs</div>;
  }

  if (!logData.length) {
    return <div className={mx('flex items-center justify-center h-full')}>No logs available</div>;
  }

  return (
    <div className={mx('h-full')}>
      <DynamicTable properties={logProperties} data={logData} />
    </div>
  );
};

type ExceptionPanelProps = {
  span: InvocationSpan;
};

export const ExceptionPanel: React.FC<ExceptionPanelProps> = ({ span }) => {
  // Get the trace queue for this invocation
  const traceQueueDxn = useMemo(() => {
    return span.invocationTraceQueue ? decodeReference(span.invocationTraceQueue).dxn : undefined;
  }, [span.invocationTraceQueue]);

  // Fetch all trace events from the queue
  const eventQueue = useQueue<TraceEvent>(traceQueueDxn);

  // Extract error logs from all trace events
  const errorLogs = useMemo(() => {
    if (!eventQueue?.items?.length) {
      return [];
    }

    return eventQueue.items
      .flatMap((event) =>
        event.logs
          .filter((log) => log.level === 'error')
          .map((log) => ({
            ...log,
            eventId: event.id,
          })),
      )
      .sort((a, b) => a.timestampMs - b.timestampMs);
  }, [eventQueue?.items]);

  if (errorLogs.length === 0) {
    return <div className={mx('flex items-center justify-center h-full')}>No errors found</div>;
  }

  return (
    <div className={mx('p-1 overflow-auto')}>
      {errorLogs.map((log, index) => {
        const context = log.context as any;
        const time = new Date(log.timestampMs).toLocaleString();
        const errorInfo = context?.err || {};
        const errorName = errorInfo._id || 'Error';
        const errorMessage = errorInfo.message || log.message;
        const stack = context?.stack;

        return (
          <div
            key={`log-${index}`}
            className={mx('mb-2 border border-red-200 dark:border-red-900 rounded overflow-hidden')}
          >
            <div className={mx('p-2')}>
              <div className={mx('flex justify-between items-start')}>
                <div className={mx('font-medium')}>{errorName}</div>
                <div className={mx('text-xs font-mono opacity-80')}>{time}</div>
              </div>
              <div className={mx('mt-1 text-xs font-mono whitespace-pre-wrap')}>{errorMessage}</div>
            </div>

            {stack && <pre className={mx('p-3 text-xs bg-neutral-50 dark:bg-neutral-900 overflow-auto')}>{stack}</pre>}
          </div>
        );
      })}
    </div>
  );
};

type RawDataPanelProps = {
  span: InvocationSpan;
};

export const RawDataPanel: React.FC<RawDataPanelProps> = ({ span }) => {
  // Get the trace queue for this invocation
  const traceQueueDxn = useMemo(() => {
    return span.invocationTraceQueue ? decodeReference(span.invocationTraceQueue).dxn : undefined;
  }, [span.invocationTraceQueue]);

  // Fetch all trace events from the queue
  const eventQueue = useQueue<TraceEvent>(traceQueueDxn);

  // Combine span and trace data - always include the span even if traces are empty
  const combinedData = useMemo(() => {
    return {
      span,
      traceEvents: eventQueue?.items ?? [],
    };
  }, [span, eventQueue?.items]);

  // SyntaxHighlighter renderer function
  const rowRenderer = ({
    rows,
    stylesheet,
    useInlineStyles,
  }: {
    rows: {
      type: 'element' | 'text';
      value?: string | number | undefined;
      tagName?: keyof React.JSX.IntrinsicElements | React.ComponentType<any> | undefined;
      properties?: { className: any[]; [key: string]: any };
      children?: any[];
    }[];
    stylesheet: any;
    useInlineStyles: any;
  }) => {
    return rows.map((row, index) => {
      return createElement({
        node: row,
        stylesheet,
        style: {},
        useInlineStyles,
        key: index,
      });
    });
  };

  return (
    <div className={mx('p-1', '[&_pre]:!overflow-visible')}>
      <SyntaxHighlighter language='json' renderer={rowRenderer}>
        {JSON.stringify(combinedData, null, 2)}
      </SyntaxHighlighter>
    </div>
  );
};

const filterBySelected = (items: InvocationSpan[], target: string | undefined) => {
  if (!target) {
    return [];
  }
  return items.filter((item) => decodeReference(item.invocationTarget).dxn?.toString() === target);
};

const groupByInvocationTarget = (items: InvocationSpan[]): Map<string, InvocationSpan[]> => {
  const result = new Map<string, InvocationSpan[]>();
  for (const item of items) {
    const key = decodeReference(item.invocationTarget).dxn?.toString();
    if (key) {
      const list = result.get(key) ?? [];
      result.set(key, list);
      list.push(item);
    }
  }
  return result;
};
