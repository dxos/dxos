//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { Trace } from '@dxos/compute';
import { Message } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

type ExceptionPanelProps = {
  messages?: readonly Trace.Message[];
};

export const ExceptionPanel: FC<ExceptionPanelProps> = ({ messages }) => {
  const exceptions = useMemo(() => {
    if (!messages?.length) {
      return [];
    }

    return messages
      .flatMap((message) =>
        message.events
          .filter((event) => Trace.isOfType(Trace.Exception, event))
          .map((event) => ({
            timestamp: event.timestamp,
            name: event.data.name,
            message: event.data.message,
            stack: event.data.stack,
          })),
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [messages]);

  if (exceptions.length === 0) {
    return (
      <div className={mx('flex w-full items-center justify-center m-4')}>
        <Message.Root>
          <Message.Title>No exceptions.</Message.Title>
        </Message.Root>
      </div>
    );
  }

  return (
    <div className={mx('p-1 overflow-auto')}>
      {exceptions.map((exception, index) => {
        const time = new Date(exception.timestamp).toLocaleString();

        return (
          <div
            key={`exception-${index}`}
            className='mb-2 border border-red-200 dark:border-red-900 rounded-sm overflow-hidden'
          >
            <div className='p-2'>
              <div className='flex justify-between items-start'>
                <div className='font-medium'>{exception.name}</div>
                <div className='text-xs font-mono opacity-80'>{time}</div>
              </div>
              <div className='mt-1 text-xs font-mono whitespace-pre-wrap'>{exception.message}</div>
            </div>

            {exception.stack && (
              <pre className='p-3 text-xs bg-neutral-50 dark:bg-neutral-900 overflow-auto'>{exception.stack}</pre>
            )}
          </div>
        );
      })}
    </div>
  );
};
