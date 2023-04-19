//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { levels } from '@dxos/log';
import { LogEntry, LogLevel, QueryLogsRequest } from '@dxos/protocols/proto/dxos/client/services';
import { useClientServices, useStream } from '@dxos/react-client';
import { Button, Input } from '@dxos/react-components';

const defaultEntry = { level: LogLevel.DEBUG, message: '' };

// TODO(wittjosiah): Virtualization.
// TODO(wittjosiah): Sticky auto-scrolling.
const LoggingPanel = () => {
  const services = useClientServices();
  if (!services) {
    return null;
  }

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [request, setRequest] = useState<QueryLogsRequest>({});
  // TODO(wittjosiah): `useStream` probably doesn't make sense here.
  const logEntry = useStream(() => services.LoggingService.queryLogs(request), defaultEntry, [request]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!logEntry.message) {
      return;
    }

    setLogs((logs) => logs.concat([logEntry]));
  }, [logEntry]);

  const handleQueryLogs = () => {
    const filtersString = inputRef.current?.value;
    if (!filtersString) {
      setRequest({});
      return;
    }

    const filters = filtersString.split(',').reduce((acc, filter) => {
      const parts = filter.split(':');
      if (parts.length === 1) {
        acc.push({ level: levels[parts[0]] });
      } else if (parts.length === 2) {
        acc.push({ level: levels[parts[1]], pattern: parts[0] });
      }
      return acc;
    }, [] as QueryLogsRequest.Filter[]);

    setRequest({ filters });
  };

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <Input label='Filters' ref={inputRef} />
      <Button onClick={handleQueryLogs}>Set</Button>
      <Button onClick={() => setLogs([])}>Clear</Button>
      <div>
        {logs.map((log, i) => (
          <p key={i}>{log.message}</p>
        ))}
      </div>
    </div>
  );
};

export default LoggingPanel;
