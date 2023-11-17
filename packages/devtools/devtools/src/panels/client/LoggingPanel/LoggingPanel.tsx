//
// Copyright 2023 DXOS.org
//

import { Trash } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { levels, parseFilter } from '@dxos/log';
import { type LogEntry, LogLevel, type QueryLogsRequest } from '@dxos/protocols/proto/dxos/client/services';
import { useClientServices } from '@dxos/react-client';
import { useStream } from '@dxos/react-client/devtools';
import { Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef } from '@dxos/react-ui-table';
import { getSize } from '@dxos/react-ui-theme';

import { MasterDetailTable, PanelContainer, Searchbar } from '../../../components';

const MAX_LOGS = 2_000;

const defaultEntry: LogEntry = { level: LogLevel.DEBUG, message: '', timestamp: new Date(0) };

const shortFile = (file?: string) => file?.split('/').slice(-1).join('/');

const colors: { [index: number]: string } = {
  [LogLevel.TRACE]: 'text-gray-700',
  [LogLevel.DEBUG]: 'text-green-700',
  [LogLevel.INFO]: 'text-blue-700',
  [LogLevel.WARN]: 'text-orange-700',
  [LogLevel.ERROR]: 'text-red-700',
};

const { helper, builder } = createColumnBuilder<LogEntry>();
const columns: TableColumnDef<LogEntry, any>[] = [
  helper.display(builder.selectRow()),
  helper.accessor('timestamp', builder.date()),
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

// TODO(wittjosiah): Virtualization.
export const LoggingPanel = () => {
  const services = useClientServices();
  if (!services) {
    return null;
  }

  // Filtering.
  // TODO(burdon): Store in context.
  const [query, setQuery] = useState<QueryLogsRequest>({});
  const onSearchChange = (text: string) => {
    if (!text) {
      setQuery({});
    }

    setQuery({ filters: parseFilter(text) });
  };

  // Logs.
  // TODO(wittjosiah): `useStream` probably doesn't make sense here.
  const logEntry = useStream(() => services.LoggingService.queryLogs(query), defaultEntry, [query]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  useEffect(() => {
    if (!logEntry.message) {
      return;
    }

    setLogs((logs) => [...logs.slice(-MAX_LOGS), logEntry]);
  }, [logEntry]);

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <Searchbar placeholder='Filter (e.g., "info", "client:debug")' onChange={onSearchChange} />
          <Toolbar.Button onClick={() => setLogs([])}>
            <Trash className={getSize(5)} />
          </Toolbar.Button>
        </Toolbar.Root>
      }
    >
      <MasterDetailTable<LogEntry> columns={columns} data={logs} pinToBottom />
    </PanelContainer>
  );
};
