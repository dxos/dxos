//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Format } from '@dxos/echo';
import { levels } from '@dxos/log';
import { type LogEntry } from '@dxos/protocols/proto/dxos/client/services';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';

// Deliberately not using the common components export to aid in code-splitting.

const shortFile = (file?: string) => file?.split('/').slice(-1).join('/');

const levelOptions = [
  { id: 'TRACE', title: 'TRACE', color: 'sky' },
  { id: 'DEBUG', title: 'DEBUG', color: 'green' },
  { id: 'INFO', title: 'INFO', color: 'blue' },
  { id: 'WARN', title: 'WARN', color: 'orange' },
  { id: 'ERROR', title: 'ERROR', color: 'red' },
];

export const LogTable = ({ logs = [] }: { logs: LogEntry[] }) => {
  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'timestamp', format: Format.TypeFormat.DateTime, sort: 'desc' as const, size: 194 },
      { name: 'level', format: Format.TypeFormat.SingleSelect, config: { options: levelOptions }, size: 80 },
      { name: 'file', format: Format.TypeFormat.String, size: 160 },
      { name: 'message', format: Format.TypeFormat.String },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      logs.map((entry) => ({
        id: `${entry.timestamp}-${Math.random()}`, // Unique ID
        timestamp: entry.timestamp,
        level: Object.entries(levels)
          .find(([, level]) => level === entry.level)?.[0]
          .toUpperCase(),
        file: `${shortFile(entry.meta?.file)}:${entry.meta?.line}`,
        message: entry.message,
        _original: entry, // Store original for cell renderer
      })),
    [logs],
  );

  return <DynamicTable properties={properties} rows={rows} />;
};
