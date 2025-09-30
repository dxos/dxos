//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { FormatEnum } from '@dxos/echo/internal';
import { levels, parseFilter } from '@dxos/log';
import { type LogEntry, LogLevel, type QueryLogsRequest } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { useStream } from '@dxos/react-client/devtools';
import { Toolbar } from '@dxos/react-ui';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer, Searchbar, Select } from '../../../components';

const MAX_LOGS = 2_000;

const defaultEntry: LogEntry = { level: LogLevel.DEBUG, message: '', timestamp: new Date(0) };

const shortFile = (file?: string) => file?.split('/').slice(-1).join('/');

// TODO(wittjosiah): Virtualization.
export const LoggingPanel = () => {
  const client = useClient();
  const loggingService = client?.services?.services?.LoggingService;
  if (!loggingService) {
    return null;
  }

  // Filtering.
  const [text, setText] = useState('');
  // TODO(burdon): Store in context.
  const [query, setQuery] = useState<QueryLogsRequest>({});
  const onSearchChange = (text: string) => {
    setText(text);
    if (!text) {
      setQuery({});
    }

    setQuery({ filters: parseFilter(text) });
  };

  // Logs.
  // TODO(wittjosiah): `useStream` probably doesn't make sense here.
  const logEntry = useStream(() => loggingService.queryLogs(query), defaultEntry, [query]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  useEffect(() => {
    if (!logEntry.message) {
      return;
    }

    setLogs((logs) => [...logs.slice(-MAX_LOGS), logEntry]);
  }, [logEntry]);

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'timestamp', format: FormatEnum.DateTime, sort: 'desc' as const, size: 194 },
      {
        name: 'level',
        format: FormatEnum.SingleSelect,
        size: 100,
        config: {
          options: [
            { id: 'TRACE', title: 'TRACE', color: 'sky' },
            { id: 'DEBUG', title: 'DEBUG', color: 'green' },
            { id: 'VERBOSE', title: 'VERBOSE', color: 'neutral' },
            { id: 'INFO', title: 'INFO', color: 'blue' },
            { id: 'WARN', title: 'WARN', color: 'orange' },
            { id: 'ERROR', title: 'ERROR', color: 'red' },
          ],
        },
      },
      { name: 'file', format: FormatEnum.String, size: 160 },
      { name: 'message', format: FormatEnum.String },
    ],
    [],
  );

  const tableData = useMemo(() => {
    return logs.map((entry, index) => ({
      id: `${entry.timestamp}-${index}`, // Stable ID based on position and timestamp
      timestamp: entry.timestamp,
      level: Object.entries(levels)
        .find(([, level]) => level === entry.level)?.[0]
        .toUpperCase(),
      file: `${shortFile(entry.meta?.file)}:${entry.meta?.line}`,
      message: entry.message,
    }));
  }, [logs]);

  const presets = useMemo(
    () => [
      { value: 'trace', label: 'Trace' },
      { value: 'debug', label: 'Debug' },
      { value: 'verbose', label: 'Verbose' },
      { value: 'info', label: 'Info' },
      { value: 'warn', label: 'Warn' },
      { value: 'error', label: 'Error' },

      // TOOD(burdon): Factor out. Move to separate pull down.
      { value: 'info,echo-edge-replicator:debug', label: 'EDGE Replication' },
    ],
    [],
  );

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          {/* TODO(wittjosiah): Reset selection value when typing manually in the searchbar. */}
          <Select items={presets} onValueChange={onSearchChange} />
          <Searchbar placeholder='Filter (e.g., "info", "client:debug")' value={text} onChange={onSearchChange} />
          <Toolbar.IconButton icon='ph--trash--regular' onClick={() => setLogs([])} label='Clear logs' />
        </Toolbar.Root>
      }
    >
      <MasterDetailTable properties={properties} data={tableData} detailsPosition='bottom' />
    </PanelContainer>
  );
};
