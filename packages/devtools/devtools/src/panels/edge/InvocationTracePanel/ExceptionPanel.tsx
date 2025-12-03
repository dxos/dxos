//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { type TraceEvent } from '@dxos/functions-runtime';
import { Callout } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

type ExceptionPanelProps = {
  objects?: TraceEvent[];
};

export const ExceptionPanel: FC<ExceptionPanelProps> = ({ objects }) => {
  const errorLogs = useMemo(() => {
    if (!objects?.length) {
      return [];
    }

    return objects
      .flatMap((event) =>
        event.logs
          .filter((log) => log.level === 'error')
          .map((log) => ({
            ...log,
            eventId: event.id,
          })),
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [objects]);

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
        const time = new Date(log.timestamp).toLocaleString();
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
