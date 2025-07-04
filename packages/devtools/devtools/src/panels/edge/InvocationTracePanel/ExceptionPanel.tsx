//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { type TraceEvent, type InvocationSpan } from '@dxos/functions';
import { useQueue } from '@dxos/react-client/echo';
import { Callout, Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

type ExceptionPanelProps = {
  span: InvocationSpan;
};

export const ExceptionPanel: FC<ExceptionPanelProps> = ({ span }) => {
  const traceQueueDxn = useMemo(() => {
    return span.invocationTraceQueue ? span.invocationTraceQueue.dxn : undefined;
  }, [span.invocationTraceQueue]);

  const eventQueue = useQueue<TraceEvent>(traceQueueDxn, { pollInterval: 2000 });

  const errorLogs = useMemo(() => {
    if (!eventQueue?.objects?.length) {
      return [];
    }

    return eventQueue.objects
      .flatMap((event) =>
        event.logs
          .filter((log) => log.level === 'error')
          .map((log) => ({
            ...log,
            eventId: event.id,
          })),
      )
      .sort((a, b) => a.timestampMs - b.timestampMs);
  }, [eventQueue?.objects]);

  if (traceQueueDxn && eventQueue?.isLoading) {
    // TODO(burdon): Create alert variant?
    return (
      <div role='none' className={mx('flex is-full items-center justify-center m-4')}>
        <Icon icon='ph--spinner-gap--regular' size={5} classNames='animate-spin' />
      </div>
    );
  }

  if (errorLogs.length === 0) {
    return (
      <div role='none' className={mx('flex is-full items-center justify-center m-4')}>
        <Callout.Root>
          <Callout.Title>No exceptions.</Callout.Title>
        </Callout.Root>
      </div>
    );
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
          <div key={`log-${index}`} className='mb-2 border border-red-200 dark:border-red-900 rounded overflow-hidden'>
            <div className='p-2'>
              <div className='flex justify-between items-start'>
                <div className='font-medium'>{errorName}</div>
                <div className='text-xs font-mono opacity-80'>{time}</div>
              </div>
              <div className='mt-1 text-xs font-mono whitespace-pre-wrap'>{errorMessage}</div>
            </div>

            {stack && <pre className='p-3 text-xs bg-neutral-50 dark:bg-neutral-900 overflow-auto'>{stack}</pre>}
          </div>
        );
      })}
    </div>
  );
};
