//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { Input, Toolbar } from '@dxos/aurora';
import { createNumberColumn, createTextColumn, GridColumn } from '@dxos/aurora-grid';
import { levels, parseFilter } from '@dxos/log';
import { LogEntry, LogLevel, QueryLogsRequest } from '@dxos/protocols/proto/dxos/client/services';
import { useClientServices } from '@dxos/react-client';
import { useStream } from '@dxos/react-client/devtools';

import { MasterDetailTable, PanelContainer } from '../../../components';

const MAX_LOGS = 2_000;

const defaultEntry: LogEntry = { level: LogLevel.DEBUG, message: '', timestamp: new Date(0) };

const columns: GridColumn<LogEntry>[] = [
  createNumberColumn('level', {
    accessor: (entry) => Object.entries(levels).find(([, level]) => level === entry.level)?.[0],
  }),
  createTextColumn('file', { accessor: (entry) => `${entry.meta?.file}:${entry.meta?.line}` }),
  createTextColumn('message'),
];

// TODO(wittjosiah): Virtualization.
// TODO(wittjosiah): Sticky auto-scrolling.
export const LoggingPanel = () => {
  const services = useClientServices();
  if (!services) {
    return null;
  }

  const [stickyScrolling, setStickyScrolling] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const logsRef = useRef<HTMLDivElement | null>(null);
  const [request, setRequest] = useState<QueryLogsRequest>({});
  // TODO(wittjosiah): `useStream` probably doesn't make sense here.
  const logEntry = useStream(() => services.LoggingService.queryLogs(request), defaultEntry, [request]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!logEntry.message) {
      return;
    }

    setLogs((logs) => [...logs.slice(-MAX_LOGS), logEntry]);
  }, [logEntry]);

  useEffect(() => {
    if (!logsRef.current) {
      return;
    }

    const container = logsRef.current;
    const handler = () => {
      setStickyScrolling(container.scrollHeight - container.scrollTop - container.clientHeight < 50);
    };

    container.addEventListener('scroll', handler);
    return () => container.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (!logsRef.current || !stickyScrolling) {
      return;
    }

    logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  const handleQueryLogs = () => {
    const filtersString = inputRef.current?.value ?? '';
    if (!filtersString) {
      setRequest({});
      return;
    }

    setRequest({ filters: parseFilter(filtersString) });
  };

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
      <MasterDetailTable<LogEntry>
        columns={columns}
        data={logs}
        slots={{ body: { className: 'max-h-screen', ref: logsRef } }}
      />
    </PanelContainer>
  );
};
