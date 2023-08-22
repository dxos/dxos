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

const { helper } = createColumnBuilder<LogEntry>();
const columns: GridColumnDef<LogEntry, any>[] = [
  // helper.accessor('id', {}), // TODO(burdon): Add id.
  helper.accessor((entry) => Object.entries(levels).find(([, level]) => level === entry.level)?.[0], { id: 'level ' }),
  helper.accessor((entry) => `${entry.meta?.file}:${entry.meta?.line}`, { id: 'file' }),
  helper.accessor('message', {}),
];

// TODO(wittjosiah): Virtualization.
// TODO(wittjosiah): Sticky auto-scrolling.
export const LoggingPanel = () => {
  const services = useClientServices();
  if (!services) {
    return null;
  }

  // Filtering.
  const inputRef = useRef<HTMLInputElement>(null);
  const [request, setRequest] = useState<QueryLogsRequest>({});
  const handleQueryLogs = () => {
    const filtersString = inputRef.current?.value ?? '';
    if (!filtersString) {
      setRequest({});
      return;
    }

    setRequest({ filters: parseFilter(filtersString) });
  };

  // Logs.
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // TODO(wittjosiah): `useStream` probably doesn't make sense here.
  const logEntry = useStream(() => services.LoggingService.queryLogs(request), defaultEntry, [request]);
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
          <Toolbar.Button onClick={handleQueryLogs}>Refresh</Toolbar.Button>
          <Toolbar.Button onClick={() => setLogs([])}>Clear</Toolbar.Button>
        </Toolbar.Root>
      }
    >
      <MasterDetailTable<LogEntry> columns={columns} data={logs} />
    </PanelContainer>
  );
};
