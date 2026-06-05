//
// Copyright 2026 DXOS.org
//

import bytes from 'bytes';
import React, { useCallback, useMemo, useState } from 'react';

import { log } from '@dxos/log';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { type StorageInfo } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools } from '@dxos/react-client/devtools';
import { useAsyncEffect } from '@dxos/react-hooks';
import { Icon, Input, ScrollArea, Toolbar, useFileDownload } from '@dxos/react-ui';
import {
  arrayToString,
  decodeUint8ArrayFromJson,
  isEncodedUint8Array,
} from '@dxos/util';

import { PanelContainer } from '../../../components';

const TABLES_QUERY = "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;";
const DATABASE_LIST_QUERY = 'PRAGMA database_list';
const DEFAULT_QUERY = TABLES_QUERY;

type DatabaseInfo = {
  version?: string;
  pageSize?: number;
  pageCount?: number;
  freelistCount?: number;
  journalMode?: string;
  backing?: string;
  databaseFile?: string;
  configuredSqliteMode?: number | string;
  servicesMode?: number | string;
  storageInfo?: StorageInfo;
};

const quoteIdentifier = (name: string): string => `"${name.replace(/"/g, '""')}"`;

const tableSelectQuery = (tableName: string): string =>
  `SELECT * FROM ${quoteIdentifier(tableName)} LIMIT 500;`;

const parseScalar = (rows: Record<string, unknown>[]): unknown => {
  const first = rows[0];
  return first ? Object.values(first)[0] : undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

export const SqlitePanel = () => {
  const devtoolsHost = useDevtools();
  const fileDownload = useFileDownload();

  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [params, setParams] = useState('');
  const [tables, setTables] = useState<string[]>([]);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | undefined>();
  const [selectedTable, setSelectedTable] = useState<string | undefined>();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [isRunning, setIsRunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        keys.add(key);
      }
    }
    return Array.from(keys);
  }, [rows]);

  const executeQuery = useCallback(
    async (sql: string, sqlParams = '') => {
      setIsRunning(true);
      setError(undefined);

      try {
        const response = await devtoolsHost.runSqliteQuery({
          query: sql,
          params: sqlParams.trim() ? sqlParams : undefined,
        });

        if (response.error) {
          setRows([]);
          setError(response.error);
          return;
        }

        setRows(JSON.parse(response.rows || '[]'));
      } catch (err) {
        log.catch(err);
        setRows([]);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsRunning(false);
      }
    },
    [devtoolsHost],
  );

  const queryScalar = useCallback(
    async (sql: string): Promise<unknown> => {
      const response = await devtoolsHost.runSqliteQuery({ query: sql });
      if (response.error) {
        throw new Error(response.error);
      }

      return parseScalar(JSON.parse(response.rows || '[]') as Record<string, unknown>[]);
    },
    [devtoolsHost],
  );

  const loadDatabaseInfo = useCallback(async () => {
    const [version, pageSize, pageCount, freelistCount, journalMode, storageInfo, configResponse, databaseListResponse] =
      await Promise.all([
        queryScalar('SELECT sqlite_version() AS value'),
        queryScalar('PRAGMA page_size'),
        queryScalar('PRAGMA page_count'),
        queryScalar('PRAGMA freelist_count'),
        queryScalar('PRAGMA journal_mode'),
        devtoolsHost.getStorageInfo(),
        devtoolsHost.getConfig(),
        devtoolsHost.runSqliteQuery({ query: DATABASE_LIST_QUERY }),
      ]);

    let configuredSqliteMode: number | string | undefined;
    let servicesMode: number | string | undefined;
    try {
      const config = JSON.parse(configResponse.config || '{}') as {
        runtime?: {
          client?: {
            servicesMode?: number | string;
            storage?: { sqliteMode?: number | string };
          };
        };
      };
      configuredSqliteMode = config.runtime?.client?.storage?.sqliteMode;
      servicesMode = config.runtime?.client?.servicesMode;
    } catch (err) {
      log.catch(err);
    }

    let databaseFile: string | undefined;
    if (!databaseListResponse.error) {
      const databases = JSON.parse(databaseListResponse.rows || '[]') as Array<{ name?: string; file?: string }>;
      databaseFile = databases.find((database) => database.name === 'main')?.file;
    }

    const backing = resolveSqliteBacking(databaseFile, servicesMode);

    setDatabaseInfo({
      version: typeof version === 'string' ? version : String(version ?? ''),
      pageSize: toNumber(pageSize),
      pageCount: toNumber(pageCount),
      freelistCount: toNumber(freelistCount),
      journalMode: typeof journalMode === 'string' ? journalMode : String(journalMode ?? ''),
      backing,
      databaseFile,
      configuredSqliteMode,
      servicesMode,
      storageInfo,
    });
  }, [devtoolsHost, queryScalar]);

  const loadTables = useCallback(async () => {
    const response = await devtoolsHost.runSqliteQuery({ query: TABLES_QUERY });
    if (response.error) {
      throw new Error(response.error);
    }

    const result = JSON.parse(response.rows || '[]') as Array<{ name?: string }>;
    setTables(result.map((row) => row.name).filter((name): name is string => typeof name === 'string'));
  }, [devtoolsHost]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(undefined);

    try {
      await Promise.all([loadDatabaseInfo(), loadTables()]);
    } catch (err) {
      log.catch(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRefreshing(false);
    }
  }, [loadDatabaseInfo, loadTables]);

  useAsyncEffect(refresh, [refresh]);

  const handleRunQuery = useCallback(async () => {
    await executeQuery(query, params);
  }, [executeQuery, params, query]);

  const handleSelectTable = useCallback(
    async (tableName: string) => {
      const nextQuery = tableSelectQuery(tableName);
      setSelectedTable(tableName);
      setQuery(nextQuery);
      setParams('');
      await executeQuery(nextQuery);
    },
    [executeQuery],
  );

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const response = await devtoolsHost.exportSqliteDatabase();
      const filename = `dxos-sqlite-${new Date().toISOString().replace(/\W/g, '-')}.db`;
      fileDownload(new Blob([response.data as Uint8Array<ArrayBuffer>]), filename);
    } catch (err) {
      log.catch(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  }, [devtoolsHost, fileDownload]);

  const databaseSize = useMemo(() => {
    const { pageSize, pageCount } = databaseInfo ?? {};
    if (pageSize == null || pageCount == null) {
      return undefined;
    }

    return pageSize * pageCount;
  }, [databaseInfo]);

  const freeSpace = useMemo(() => {
    const { pageSize, freelistCount } = databaseInfo ?? {};
    if (pageSize == null || freelistCount == null) {
      return undefined;
    }

    return pageSize * freelistCount;
  }, [databaseInfo]);

  return (
    <PanelContainer
      classNames='grid grid-cols-[240px_1fr] divide-x divide-separator h-full'
      toolbar={
        <Toolbar.Root className='col-span-2'>
          <Toolbar.Button onClick={handleRunQuery} disabled={isRunning || !query.trim()}>
            Run Query
          </Toolbar.Button>
          <Toolbar.Button onClick={refresh} disabled={isRefreshing}>
            Refresh
          </Toolbar.Button>
          <Toolbar.IconButton
            icon='ph--download--regular'
            label='Export database'
            onClick={handleExport}
            disabled={isExporting}
          />
        </Toolbar.Root>
      }
    >
      <div className='flex flex-col h-full overflow-hidden'>
        <div className='p-2 border-b border-separator'>
          <div className='text-xs font-medium mb-2'>Database</div>
          {databaseInfo ? (
            <dl className='grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs font-mono'>
              <InfoItem label='Version' value={databaseInfo.version} />
              <InfoItem label='Backing' value={databaseInfo.backing} />
              <InfoItem label='File' value={databaseInfo.databaseFile} />
              <InfoItem label='Services' value={formatServicesMode(databaseInfo.servicesMode)} />
              {databaseInfo.configuredSqliteMode != null &&
                formatSqliteMode(databaseInfo.configuredSqliteMode) !== databaseInfo.backing && (
                  <InfoItem
                    label='Config'
                    value={`${formatSqliteMode(databaseInfo.configuredSqliteMode)} (stale)`}
                  />
                )}
              <InfoItem label='Journal' value={databaseInfo.journalMode} />
              <InfoItem label='Size' value={databaseSize != null ? bytes.format(databaseSize) : undefined} />
              <InfoItem label='Free' value={freeSpace != null ? bytes.format(freeSpace) : undefined} />
              <InfoItem label='Pages' value={formatPages(databaseInfo.pageCount, databaseInfo.pageSize)} />
              <InfoItem label='Tables' value={tables.length > 0 ? String(tables.length) : undefined} />
              <InfoItem
                label='Origin'
                value={
                  databaseInfo.storageInfo
                    ? `${bytes.format(databaseInfo.storageInfo.originUsage)} / ${bytes.format(databaseInfo.storageInfo.usageQuota)}`
                    : undefined
                }
              />
            </dl>
          ) : (
            <div className='text-sm text-neutral-400'>{isRefreshing ? 'Loading database info...' : 'No info.'}</div>
          )}
        </div>

        <ScrollArea.Root thin>
          <ScrollArea.Viewport classNames='p-2'>
            <div className='text-xs font-medium mb-2'>Tables</div>
            {tables.length === 0 ? (
              <div className='text-sm text-neutral-400'>{isRefreshing ? 'Loading tables...' : 'No tables.'}</div>
            ) : (
              <div className='flex flex-col gap-1'>
                {tables.map((tableName) => (
                  <button
                    key={tableName}
                    type='button'
                    className={[
                      'flex items-center gap-2 rounded px-2 py-1 text-left text-xs font-mono hover:bg-hoverOverlay',
                      selectedTable === tableName ? 'bg-hoverOverlay' : '',
                    ].join(' ')}
                    onClick={() => handleSelectTable(tableName)}
                    disabled={isRunning}
                  >
                    <Icon icon='ph--table--regular' size={4} />
                    {tableName}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </div>

      <div className='flex flex-col h-full overflow-hidden'>
        <div className='flex flex-col gap-2 p-2 border-b border-separator'>
          <Input.Root>
            <Input.Label>SQL</Input.Label>
            <Input.TextArea
              value={query}
              onChange={({ target }) => setQuery(target.value)}
              classNames='min-h-24 font-mono text-xs'
            />
          </Input.Root>
          <Input.Root>
            <Input.Label>Params (JSON array)</Input.Label>
            <Input.TextInput
              value={params}
              onChange={({ target }) => setParams(target.value)}
              placeholder='[]'
              classNames='font-mono text-xs'
            />
          </Input.Root>
        </div>

        {error && <div className='p-2 text-sm text-red-500 font-mono'>{error}</div>}

        <ScrollArea.Root thin>
          <ScrollArea.Viewport>
            {rows.length === 0 && !error ? (
              <div className='p-2 text-sm text-neutral-400'>No rows.</div>
            ) : (
              <table className='w-full text-xs font-mono'>
                <thead>
                  <tr className='border-b border-separator text-left'>
                    {columns.map((column) => (
                      <th key={column} className='p-2 font-medium'>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className='border-b border-separator align-top'>
                      {columns.map((column) => (
                        <td key={column} className='p-2 whitespace-pre-wrap break-all'>
                          <CellValue value={row[column]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </div>
    </PanelContainer>
  );
};

const SERVICES_MODE_LABELS: Record<Runtime.Client.ServicesMode, string> = {
  [Runtime.Client.ServicesMode.UNSPECIFIED_SERVICES_MODE]: 'Unspecified',
  [Runtime.Client.ServicesMode.HOST]: 'Host (in-process)',
  [Runtime.Client.ServicesMode.SHARED_WORKER]: 'Shared worker',
  [Runtime.Client.ServicesMode.DEDICATED_WORKER]: 'Dedicated worker',
};

const SQLITE_MODE_LABELS: Record<Runtime.Client.Storage.SqliteMode, string> = {
  [Runtime.Client.Storage.SqliteMode.UNSPECIFIED_SQLITE_MODE]: 'Default (memory)',
  [Runtime.Client.Storage.SqliteMode.MEMORY]: 'Memory',
  [Runtime.Client.Storage.SqliteMode.OPFS]: 'OPFS (browser worker)',
  [Runtime.Client.Storage.SqliteMode.FILE]: 'File (persistent)',
};

const formatServicesMode = (value: number | string | undefined): string | undefined => {
  if (value == null) {
    return undefined;
  }

  const modes = Runtime.Client.ServicesMode;

  if (typeof value === 'number') {
    return SERVICES_MODE_LABELS[value as Runtime.Client.ServicesMode] ?? `Unknown (${value})`;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value);
    if (Number.isInteger(numeric) && numeric in SERVICES_MODE_LABELS) {
      return SERVICES_MODE_LABELS[numeric as Runtime.Client.ServicesMode];
    }

    const enumValue = modes[value as keyof typeof modes];
    if (typeof enumValue === 'number') {
      return SERVICES_MODE_LABELS[enumValue];
    }

    return value;
  }

  return String(value);
};

const resolveSqliteBacking = (databaseFile: string | undefined, servicesMode?: number | string): string => {
  const normalized = String(databaseFile ?? '').trim();
  if (!normalized || normalized === ':memory:') {
    return 'Memory';
  }

  if (normalized === 'DXOS' || normalized.toLowerCase().includes('opfs')) {
    const servicesLabel = formatServicesMode(servicesMode);
    if (servicesLabel === 'Dedicated worker') {
      return 'OPFS (persistent, in-worker)';
    }

    if (servicesLabel === 'Host (in-process)') {
      return 'OPFS (persistent, worker)';
    }

    return 'OPFS (persistent)';
  }

  if (normalized.endsWith('.db') || normalized.startsWith('/')) {
    return `File (${normalized})`;
  }

  return `Persistent (${normalized})`;
};

const formatSqliteMode = (value: number | string | undefined): string | undefined => {
  if (value == null) {
    return undefined;
  }

  const modes = Runtime.Client.Storage.SqliteMode;

  if (typeof value === 'number') {
    return SQLITE_MODE_LABELS[value as Runtime.Client.Storage.SqliteMode] ?? `Unknown (${value})`;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value);
    if (Number.isInteger(numeric) && numeric in SQLITE_MODE_LABELS) {
      return SQLITE_MODE_LABELS[numeric as Runtime.Client.Storage.SqliteMode];
    }

    const enumValue = modes[value as keyof typeof modes];
    if (typeof enumValue === 'number') {
      return SQLITE_MODE_LABELS[enumValue];
    }

    return value;
  }

  return String(value);
};

const InfoItem = ({ label, value }: { label: string; value?: string }) => (
  <>
    <dt className='text-neutral-400'>{label}</dt>
    <dd className='truncate'>{value ?? '—'}</dd>
  </>
);

const formatPages = (pageCount?: number, pageSize?: number): string | undefined => {
  if (pageCount == null || pageSize == null) {
    return undefined;
  }

  return `${pageCount.toLocaleString()} x ${bytes.format(pageSize)}`;
};

const HEX_PREVIEW_BYTES = 16;

const parseBinaryValue = (value: unknown): Uint8Array | undefined => {
  if (value == null) {
    return undefined;
  }

  if (value instanceof Uint8Array) {
    return value;
  }

  if (isEncodedUint8Array(value)) {
    return decodeUint8ArrayFromJson(value);
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    if (record.type === 'Buffer' && Array.isArray(record.data)) {
      return Uint8Array.from(record.data as number[]);
    }

    return fromNumericByteObject(record);
  }

  return undefined;
};

const fromNumericByteObject = (record: Record<string, unknown>): Uint8Array | undefined => {
  const keys = Object.keys(record);
  if (keys.length === 0 || !keys.every((key) => /^\d+$/.test(key))) {
    return undefined;
  }

  const maxIndex = Math.max(...keys.map((key) => Number(key)));
  const bytes = new Uint8Array(maxIndex + 1);

  for (const key of keys) {
    const index = Number(key);
    const byte = record[key];
    if (!Number.isInteger(index) || index < 0) {
      return undefined;
    }

    if (typeof byte !== 'number' || !Number.isInteger(byte) || byte < 0 || byte > 255) {
      return undefined;
    }

    bytes[index] = byte;
  }

  return bytes;
};

const isMostlyPrintable = (data: Uint8Array): boolean => {
  if (data.length === 0) {
    return true;
  }

  let printable = 0;
  for (const byte of data) {
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126)) {
      printable++;
    }
  }

  return printable / data.length >= 0.95;
};

const truncateText = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const formatHexPreview = (data: Uint8Array): string => {
  const hex = arrayToString(data);
  const previewLength = HEX_PREVIEW_BYTES * 2;
  return hex.length > previewLength ? `${hex.slice(0, previewLength)}…` : hex;
};

const formatHexDump = (data: Uint8Array): string => {
  const lines: string[] = [];
  for (let offset = 0; offset < data.length; offset += 16) {
    const chunk = data.subarray(offset, offset + 16);
    const hex = Array.from(chunk, (byte) => byte.toString(16).padStart(2, '0')).join(' ');
    const ascii = Array.from(chunk, (byte) =>
      byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.',
    ).join('');
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${hex.padEnd(16 * 3 - 1, ' ')}  ${ascii}`);
  }

  return lines.join('\n');
};

const BinaryCell = ({ data }: { data: Uint8Array }) => {
  const text = isMostlyPrintable(data) ? new TextDecoder().decode(data) : undefined;

  return (
    <details>
      <summary className='cursor-pointer list-none'>
        <span className='inline-flex flex-wrap items-center gap-1'>
          <span className='rounded bg-neutral-500/15 px-1 text-neutral-400'>blob</span>
          <span>{bytes.format(data.length)}</span>
          {text ? (
            <span className='text-foreground'>"{truncateText(text, 48)}"</span>
          ) : (
            <span className='text-neutral-500'>{formatHexPreview(data)}</span>
          )}
        </span>
      </summary>
      <pre className='mt-1 max-h-48 overflow-auto text-[10px] leading-4 whitespace-pre'>
        {formatHexDump(data)}
      </pre>
    </details>
  );
};

const CellValue = ({ value }: { value: unknown }) => {
  if (value == null) {
    return null;
  }

  const binary = parseBinaryValue(value);
  if (binary) {
    return <BinaryCell data={binary} />;
  }

  if (typeof value === 'object') {
    return <span>{JSON.stringify(value)}</span>;
  }

  return <span>{String(value)}</span>;
};
