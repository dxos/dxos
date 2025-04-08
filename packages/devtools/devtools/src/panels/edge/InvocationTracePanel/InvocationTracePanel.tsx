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
  FunctionType,
  ScriptType,
} from '@dxos/functions/types';
import { type DXN } from '@dxos/keys';
import { Filter, useQuery, useQueue, type Space } from '@dxos/react-client/echo';
import { Tag, Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/react-ui-theme';

import { PanelContainer, Placeholder } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

export const InvocationTracePanel = (props: { space?: Space }) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
  const invocationsQueue = useQueue<InvocationTraceEvent>(space?.properties.invocationTraceQueue?.dxn, {
    pollInterval: 1000,
  });

  const invocationSpans = useMemo(
    () => createInvocationSpans(invocationsQueue?.items),
    [invocationsQueue?.items ?? []],
  );

  const [selectedId, setSelectedId] = useState<string>();

  const selectedInvocation = useMemo(() => {
    if (!selectedId) {
      return undefined;
    }
    return invocationSpans.find((span) => selectedId === span.id);
  }, [selectedId, invocationSpans]);

  const resolver = useScriptNameResolver({ space });

  const invocationProperties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'target', title: 'Target', format: FormatEnum.String, size: 200 },
      { name: 'time', title: 'Time', format: FormatEnum.String, sort: 'desc' as const, size: 200 },
      {
        name: 'status',
        title: 'Status',
        format: FormatEnum.SingleSelect,
        size: 110,
        config: {
          options: [
            { id: 'in-progress', title: 'In Progress', color: 'blue' },
            { id: 'success', title: 'Success', color: 'emerald' },
            { id: 'failure', title: 'Failure', color: 'red' },
            { id: 'unknown', title: 'Unknown', color: 'neutral' },
          ],
        },
      },
      { name: 'duration', title: 'Duration', format: FormatEnum.String, size: 120 },
      { name: 'queue', title: 'Queue', format: FormatEnum.String },
    ],
    [],
  );

  const invocationData = useMemo(() => {
    return invocationSpans.map((invocation) => {
      let status = 'unknown';
      if (invocation.outcome === 'in-progress') {
        status = 'in-progress';
      } else if (invocation.outcome === InvocationOutcome.SUCCESS) {
        status = 'success';
      } else if (invocation.outcome === InvocationOutcome.FAILURE) {
        status = 'failure';
      }

      const targetDxn = decodeReference(invocation.invocationTarget).dxn;

      return {
        id: `${invocation.id}`,
        target: resolver(targetDxn),
        time: new Date(invocation.timestampMs).toLocaleString(),
        status,
        duration: formatDuration(invocation.durationMs),
        queue: decodeReference(invocation.invocationTraceQueue).dxn?.toString() ?? 'unknown',
        _original: invocation,
      };
    });
  }, [invocationSpans, resolver]);

  const handleInvocationRowClicked = useCallback((row: any) => {
    if (!row) {
      return;
    }
    setSelectedId(row.id);
  }, []);

  const [activeTab, setActiveTab] = useState('logs');

  const gridLayout = useMemo(() => {
    if (selectedInvocation) {
      return 'grid grid-cols-[1fr_30rem]';
    }
    return 'grid grid-cols-1';
  }, [selectedInvocation]);

  return (
    <PanelContainer toolbar={<Toolbar.Root>{!props.space && <DataSpaceSelector />}</Toolbar.Root>}>
      <div className={mx('bs-full', gridLayout)}>
        <div>
          <DynamicTable
            properties={invocationProperties}
            data={invocationData}
            onRowClicked={handleInvocationRowClicked}
          />
        </div>
        {selectedInvocation && (
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
        )}
      </div>
    </PanelContainer>
  );
};

type SpanSummaryProps = { span: InvocationSpan };

export const SpanSummary: React.FC<SpanSummaryProps> = ({ span }) => {
  const [currentDuration, setCurrentDuration] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!span) {
      return;
    }

    const isInProgress = span.outcome === 'in-progress';
    if (!isInProgress) {
      setCurrentDuration(span.durationMs);
      return;
    }
    setCurrentDuration(Date.now() - span.timestampMs);

    const interval = setInterval(() => setCurrentDuration(Date.now() - span.timestampMs), 100);
    return () => clearInterval(interval);
  }, [span]);

  const targetDxn = useMemo(
    () => decodeReference(span.invocationTarget).dxn?.toString() ?? 'unknown',
    [span.invocationTarget],
  );
  const targetName = useMemo(() => targetDxn.split(':').pop() ?? 'unknown', [targetDxn]);

  const timestamp = useMemo(() => new Date(span.timestampMs).toLocaleString(), [span.timestampMs]);
  const isInProgress = useMemo(() => span.outcome === 'in-progress', [span.outcome]);
  const outcomeColor = useMemo(() => {
    if (isInProgress) {
      return 'blue';
    }
    return span.outcome === InvocationOutcome.SUCCESS ? 'emerald' : 'red';
  }, [isInProgress, span.outcome]);

  const outcomeLabel = useMemo(() => {
    if (isInProgress) {
      return 'In Progress';
    }
    // Capitalize first letter of outcome
    return span.outcome.charAt(0).toUpperCase() + span.outcome.slice(1);
  }, [isInProgress, span.outcome]);

  return (
    <div className={mx('p-2 overflow-auto')}>
      <div className={mx('flex justify-between items-start')}>
        <div>
          <h3 className={mx('text-lg font-medium mb-1')}>{targetName}</h3>
          <div className={mx('flex gap-2 items-center')}>
            <Tag palette={outcomeColor}>{outcomeLabel}</Tag>
            <span className={mx('text-sm text-neutral')}>{timestamp}</span>
            <span className={mx('text-sm')}>
              {currentDuration ? formatDuration(currentDuration) : formatDuration(span.durationMs)}
            </span>
          </div>
        </div>

        {span.trigger && (
          <Tag palette='amber'>
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
  const eventQueue = useQueue<TraceEvent>(traceQueueDxn, { pollInterval: 2000 });

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

  if (traceQueueDxn && eventQueue?.isLoading) {
    return <div className={mx('flex items-center justify-center')}>Loading trace data...</div>;
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
  const eventQueue = useQueue<TraceEvent>(traceQueueDxn, { pollInterval: 2000 });

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

  if (traceQueueDxn && eventQueue?.isLoading) {
    return <div className={mx('flex items-center justify-center h-full')}>Loading trace data...</div>;
  }

  if (errorLogs.length === 0) {
    return <div className={mx('flex items-center justify-center h-full')}>No exceptions found</div>;
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

// TODO(ZaymonFC): There should be a more efficient and less laborious way of doing this.
const useScriptNameResolver = ({ space }: { space?: Space }) => {
  const scripts = useQuery(space, Filter.schema(ScriptType));
  const functions = useQuery(space, Filter.schema(FunctionType));

  return useCallback(
    (invocationTargetId: DXN | undefined) => {
      if (!invocationTargetId) {
        return undefined;
      }

      const dxnParts = invocationTargetId.toString().split(':');
      const uuidPart = dxnParts[dxnParts.length - 1];

      const matchingFunction = functions.find((f) => f.name === uuidPart);
      if (matchingFunction) {
        const matchingScript = scripts.find((script) => matchingFunction.source?.target?.id === script.id);
        if (matchingScript) {
          return matchingScript.name;
        }
        return matchingFunction.name;
      }

      return undefined;
    },
    [functions, scripts],
  );
};

const formatDuration = (duration: number): string => {
  if (duration < 1000) {
    return `${duration}ms`;
  }
  return `${(duration / 1000).toFixed(2)}s`;
};
