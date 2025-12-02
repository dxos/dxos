//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { Format } from '@dxos/echo/internal';
import { TraceEvent } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import { Filter, type Queue, useQuery } from '@dxos/react-client/echo';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';

type LogPanelProps = {
  queue?: Queue;
};

export const LogPanel: FC<LogPanelProps> = ({ queue }) => {
  const objects = useQuery(queue, Filter.type(TraceEvent));
  log.info('Objects', { objects });

  // Define properties for the DynamicTable
  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'time', title: 'Started', format: Format.TypeFormat.DateTime, sort: 'desc' as const, size: 194 },
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

    return objects.flatMap((event) => {
      return event.logs.map((log) => ({
        id: `${event.id}-${log.timestamp}`,
        timestamp: new Date(log.timestamp).toLocaleString(),
        level: log.level,
        message: log.message,
        context: safeStringify(log.context),
      }));
    });
  }, [objects]);

  return <DynamicTable properties={properties} rows={rows} />;
};
