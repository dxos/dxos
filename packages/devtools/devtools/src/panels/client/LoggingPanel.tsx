//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { Button, ButtonGroup } from '@dxos/aurora';
import { levels, parseFilter } from '@dxos/log';
import { TableColumn } from '@dxos/mosaic';
import { LogEntry, LogLevel, QueryLogsRequest } from '@dxos/protocols/proto/dxos/client/services';
import { Input } from '@dxos/react-appkit';
import { useClientServices, useStream } from '@dxos/react-client';

import { MasterTable } from '../../components';

const defaultEntry: LogEntry = { level: LogLevel.DEBUG, message: '', timestamp: new Date(0) };

const MAX_LOGS = 2000;

const columns: TableColumn<LogEntry>[] = [
  {
    Header: 'Level',
    width: 30,
    accessor: (entry) => Object.entries(levels).find(([, level]) => level === entry.level)?.[0],
  },
  {
    Header: 'File',
    width: 80,
    accessor: (entry) => `${entry.meta?.file}:${entry.meta?.line}`,
  },
  {
    Header: 'Message',
    width: 200,
    accessor: 'message',
  },
];

// TODO(wittjosiah): Virtualization.
// TODO(wittjosiah): Sticky auto-scrolling.
const LoggingPanel = () => {
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
    <div className='flex flex-1 flex-col overflow-hidden'>
      <div className='p-2 border-b'>
        <div className='flex items-end gap-2 w-[600px]'>
          <Input label='Filters' ref={inputRef} slots={{ root: { className: 'grow' } }} />
          <ButtonGroup>
            <Button onClick={handleQueryLogs}>Set Filters</Button>
            <Button onClick={() => setLogs([])}>Clear Logs</Button>
          </ButtonGroup>
        </div>
      </div>
      <div className='flex flex-1 overflow-hidden'>
        <MasterTable<LogEntry>
          columns={columns}
          data={logs}
          slots={{ body: { className: 'max-h-screen', ref: logsRef } }}
        />
      </div>
    </div>
  );
};

export default LoggingPanel;
