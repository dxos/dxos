//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { Input, Toolbar } from '@dxos/aurora';
import { createColumnBuilder, GridColumnDef } from '@dxos/aurora-grid';
import { levels, parseFilter } from '@dxos/log';
import { LogEntry, LogLevel, QueryLogsRequest } from '@dxos/protocols/proto/dxos/client/services';
import { useClientServices } from '@dxos/react-client';
import { useStream } from '@dxos/react-client/devtools';

import { MasterDetailTable, PanelContainer } from '../../../components';

const MAX_LOGS = 2_000;

const defaultEntry: LogEntry = { level: LogLevel.DEBUG, message: '', timestamp: new Date(0) };

const shortFile = (file?: string) => file?.split('/').slice(-1).join('/');

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState<QueryLogsRequest>({});
  const handleQueryLogs = () => {
    const filtersString = inputRef.current?.value ?? '';
    if (!filtersString) {
      setQuery({});
      return;
    }

    setQuery({ filters: parseFilter(filtersString) });
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
          <Input.Root>
            <Input.TextInput ref={inputRef} placeholder='Filter (e.g., "info", "client:debug")' />
          </Input.Root>
          <Toolbar.Button onClick={handleQueryLogs}>Update</Toolbar.Button>
          <Toolbar.Button onClick={() => setLogs([])}>Clear</Toolbar.Button>
        </Toolbar.Root>
      }
    >
      <MasterDetailTable<LogEntry> columns={columns} data={logs} pinToBottom />
    </PanelContainer>
  );
};
