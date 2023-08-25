//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { createColumnBuilder, Grid, GridColumnDef } from '@dxos/aurora-grid';
import { levels, LogLevel } from '@dxos/log';
import { LogEntry } from '@dxos/protocols/proto/dxos/client/services';

// Deliberately not using the common components export to aid in code-splitting.

// TODO(dmaretskyi): Unify with Logging panel.
const colors: { [index: number]: string } = {
  [LogLevel.TRACE]: 'text-sky-500',
  [LogLevel.DEBUG]: 'text-green-500',
  [LogLevel.INFO]: 'text-blue-500',
  [LogLevel.WARN]: 'text-orange-500',
  [LogLevel.ERROR]: 'text-red-500',
};

const shortFile = (file?: string) => file?.split('/').slice(-1).join('/');

const logColumns = (() => {
  const { helper, builder } = createColumnBuilder<LogEntry>();
  const columns: GridColumnDef<LogEntry, any>[] = [
    helper.accessor('timestamp', builder.createDate()),
    helper.accessor(
      (entry) =>
        Object.entries(levels)
          .find(([, level]) => level === entry.level)?.[0]
          .toUpperCase(),
      {
        id: 'level',
        size: 60,
        cell: (cell) => <div className={colors[cell.row.original.level]}>{cell.getValue()}</div>,
      },
    ),
    helper.accessor((entry) => `${shortFile(entry.meta?.file)}:${entry.meta?.line}`, { id: 'file', size: 160 }),
    helper.accessor('message', {}),
  ];
  return columns;
})();

export const LogView: FC<{ logs: LogEntry[] }> = ({ logs = [] }) => {
  return <Grid<LogEntry> columns={logColumns} data={logs} />;
};
