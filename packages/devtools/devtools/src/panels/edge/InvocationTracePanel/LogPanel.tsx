//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { type InvocationSpan, type TraceEvent } from '@dxos/functions';
import { useQueue } from '@dxos/react-client/echo';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

type LogPanelProps = {
  span?: InvocationSpan;
};

export const LogPanel: FC<LogPanelProps> = ({ span }) => {
  // Get the trace queue for this invocation
  const traceQueueDxn = useMemo(() => {
    return span?.invocationTraceQueue ? span.invocationTraceQueue.dxn : undefined;
  }, [span?.invocationTraceQueue]);

  // Fetch all trace events from the queue
  const eventQueue = useQueue<TraceEvent>(traceQueueDxn, { pollInterval: 2000 });

  // Define properties for the DynamicTable
  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'time', title: 'Started', format: FormatEnum.DateTime, sort: 'desc' as const, size: 194 },
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

  const rows = useMemo(() => {
    if (!eventQueue?.objects?.length) {
      return [];
    }

    return eventQueue.objects.flatMap((event) => {
      return event.logs.map((log) => ({
        id: `${event.id}-${log.timestampMs}`,
        time: new Date(log.timestampMs).toLocaleString(),
        level: log.level,
        message: log.message,
        context: JSON.stringify(log.context) ?? {},
        _original: { ...log, eventId: event.id },
      }));
    });
  }, [eventQueue?.objects]);

  if (traceQueueDxn && eventQueue?.isLoading) {
    return <div className={mx('flex items-center justify-center')}>Loading trace data...</div>;
  }

  return <DynamicTable properties={properties} rows={rows} />;
};
