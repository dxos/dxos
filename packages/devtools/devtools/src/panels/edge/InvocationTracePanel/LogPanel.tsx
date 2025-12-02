//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { Format } from '@dxos/echo/internal';
import { TraceEvent } from '@dxos/functions-runtime';
import { Filter, type Queue, useQuery } from '@dxos/react-client/echo';
import { DynamicTable } from '@dxos/react-ui-table';
import { type SchemaPropertyDefinition } from '@dxos/schema';

type LogPanelProps = {
  queue?: Queue;
};

export const LogPanel: FC<LogPanelProps> = ({ queue }) => {
  const objects = useQuery(queue, Filter.type(TraceEvent));

  // Define properties for the DynamicTable
  const properties: SchemaPropertyDefinition[] = useMemo(
    () => [
      { name: 'time', title: 'Started', format: Format.TypeFormat.DateTime, sort: 'desc' as const },
      {
        name: 'level',
        title: 'Level',
        format: Format.TypeFormat.SingleSelect,
        size: 100,
        config: {
          options: [
            { id: 'error', title: 'ERROR', color: 'red' },
            { id: 'warn', title: 'WARN', color: 'amber' },
            { id: 'log', title: 'LOG', color: 'neutral' },
            { id: 'info', title: 'INFO', color: 'blue' },
            { id: 'debug', title: 'DEBUG', color: 'neutral' },
            { id: 'trace', title: 'TRACE', color: 'neutral' },
            { id: 'verbose', title: 'VERBOSE', color: 'neutral' },
          ],
        },
      },
      { name: 'message', title: 'Message', format: Format.TypeFormat.String },
      { name: 'context', title: 'Context', format: Format.TypeFormat.JSON, size: 500 },
    ],
    [],
  );

  const rows = useMemo(() => {
    if (!objects?.length) {
      return [];
    }

    const safeStringify = (value: any) => {
      try {
        if (value == null) {
          return '';
        }
        const seen = new WeakSet();
        return JSON.stringify(
          value,
          (key, val) => {
            if (typeof val === 'object' && val !== null) {
              if (seen.has(val)) {
                return '[Circular]';
              }
              seen.add(val);
            }
            return val;
          },
          2,
        );
      } catch {
        return '[Unserializable]';
      }
    };

    return objects.flatMap((event) =>
      event.logs.map((log, idx) => ({
        id: `${event.id}-${idx}`,
        time: new Date(log.timestamp),
        level: log.level,
        message: log.message,
        context: safeStringify(log.context),
      })),
    );
  }, [objects]);

  return (
    <div className='bs-full is-full min-bs-[20rem] overflow-hidden'>
      <DynamicTable
        classNames='min-bs-0 min-is-0 is-full bs-full' //
        properties={properties}
        rows={rows}
      />
    </div>
  );
};
