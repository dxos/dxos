//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { TraceEvent } from '@dxos/functions';
import { Filter, type Queue, useQuery } from '@dxos/react-client/echo';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';

type LogPanelProps = {
  queue?: Queue;
};

export const LogPanel: FC<LogPanelProps> = ({ queue }) => {
  const objects = useQuery(queue, Filter.type(TraceEvent));

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
    if (!objects?.length) {
      return [];
    }

    return objects.flatMap((event) => {
      return event.logs.map((log) => ({
        id: `${event.id}-${log.timestamp}`,
        timestamp: new Date(log.timestamp).toLocaleString(),
        level: log.level,
        message: log.message,
        context: JSON.stringify(log.context) ?? {},
        _original: { ...log, eventId: event.id },
      }));
    });
  }, [objects]);

  return <DynamicTable properties={properties} rows={rows} />;
};
