//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { decodeReference } from '@dxos/echo-protocol';
import { type TraceEvent, type InvocationSpan } from '@dxos/functions/types';
import { useQueue } from '@dxos/react-client/echo';
import { mx } from '@dxos/react-ui-theme';

type ExceptionPanelProps = {
  span: InvocationSpan;
};

export const ExceptionPanel: React.FC<ExceptionPanelProps> = ({ span }) => {
  const traceQueueDxn = useMemo(() => {
    return span.invocationTraceQueue ? decodeReference(span.invocationTraceQueue).dxn : undefined;
  }, [span.invocationTraceQueue]);

  const eventQueue = useQueue<TraceEvent>(traceQueueDxn, { pollInterval: 2000 });

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
