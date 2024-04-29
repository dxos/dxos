//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { levels, LogLevel } from '@dxos/log';
import { type LogEntry } from '@dxos/protocols/proto/dxos/client/services';
import { createColumnBuilder, Table, type TableColumnDef, textPadding } from '@dxos/react-ui-table';

// Deliberately not using the common components export to aid in code-splitting.

// TODO(dmaretskyi): Unify with Logging panel.
const colors: Record<number, string> = {
  [LogLevel.TRACE]: 'text-sky-500',
  [LogLevel.DEBUG]: 'text-green-500',
  [LogLevel.INFO]: 'text-blue-500',
  [LogLevel.WARN]: 'text-orange-500',
  [LogLevel.ERROR]: 'text-red-500',
};

const shortFile = (file?: string) => file?.split('/').slice(-1).join('/');

const logColumns = (() => {
  const { helper, builder } = createColumnBuilder<LogEntry>();
  const columns: TableColumnDef<LogEntry, any>[] = [
    helper.accessor('timestamp', builder.date()),
    helper.accessor(
      (entry) =>
        Object.entries(levels)
          .find(([, level]) => level === entry.level)?.[0]
          .toUpperCase(),
      {
        id: 'level',
        size: 60,
        meta: { cell: { classNames: textPadding } },
        cell: (cell) => <div className={colors[cell.row.original.level]}>{cell.getValue()}</div>,
      },
    ),
    helper.accessor((entry) => `${shortFile(entry.meta?.file)}:${entry.meta?.line}`, {
      id: 'file',
      meta: { cell: { classNames: textPadding } },
      size: 160,
    }),
    helper.accessor('message', { meta: { cell: { classNames: textPadding } } }),
  ];
  return columns;
})();

export const LogTable: FC<{ logs: LogEntry[] }> = ({ logs = [] }) => {
  return <Table.Table<LogEntry> columns={logColumns} data={logs} fullWidth />;
};
