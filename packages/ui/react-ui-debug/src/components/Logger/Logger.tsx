//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type LogConfig, type LogEntry, LogLevel, type LogOptions, log, logFileRegistry, shouldLog } from '@dxos/log';

import { formatLogEntry } from './format';

//
// Shared
//

export const LEVELS = ['trace', 'debug', 'verbose', 'info', 'warn', 'error'] as const;
export type LevelName = (typeof LEVELS)[number];

const DEFAULT_MAX_LINES = 1000;

export const levelColor = (level: LogLevel) =>
  level > LogLevel.WARN
    ? 'text-error-text'
    : level > LogLevel.INFO
      ? 'text-warning-text'
      : level > LogLevel.VERBOSE
        ? 'text-info-text'
        : 'text-success-text';

// Ref-counted global-config ownership so concurrent panels restore the original config only after the last stops.
let activeRecorders = 0;
let sharedSavedOptions: LogOptions | undefined;

const acquireLogConfig = (): void => {
  if (activeRecorders === 0) {
    sharedSavedOptions = log.runtimeConfig.options;
  }
  activeRecorders += 1;
};

const releaseLogConfig = (): void => {
  activeRecorders = Math.max(0, activeRecorders - 1);
  if (activeRecorders === 0 && sharedSavedOptions) {
    log.config(sharedSavedOptions);
    sharedSavedOptions = undefined;
  }
};

// Guard clipboard writes so rejected or unavailable writes surface rather than dangling as unhandled rejections.
export const copyToClipboard = (text: string): void => {
  void navigator.clipboard?.writeText(text)?.catch((err) => console.warn('clipboard write failed', err));
};

type LogRow = { id: number; entry: LogEntry };

// Compose the base filter with per-file overrides into a single @dxos/log filter string.
// Order-independent: an override below the base level raises that file's verbosity; above, it quiets it.
export const composeFilter = (base: string, fileLevels: Map<string, LevelName>): string =>
  [base, ...[...fileLevels].map(([file, level]) => `${file}:${level}`)].filter(Boolean).join(', ');

//
// Context
//

type LoggerContextValue = {
  rows: LogRow[];
  filter: string;
  setFilter: (filter: string) => void;
  recording: boolean;
  setRecording: (fn: (value: boolean) => boolean) => void;
  files: string[];
  fileLevels: Map<string, LevelName>;
  setFileLevel: (file: string, level: LevelName | undefined) => void;
  clearFileLevels: () => void;
  expanded: Set<number>;
  toggleExpand: (id: number) => void;
  clear: () => void;
  copyAll: () => void;
};

const [LoggerProvider, useLoggerContext] = createContext<LoggerContextValue>('Logger');

//
// Root
//

export type LoggerRootProps = PropsWithChildren<{
  maxLines?: number;
  initialFilter?: string;
  defaultRecording?: boolean;
}>;

const LoggerRoot = ({
  children,
  maxLines = DEFAULT_MAX_LINES,
  initialFilter = 'info',
  defaultRecording = true,
}: LoggerRootProps) => {
  const [filter, setFilter] = useState(initialFilter);
  const [recording, setRecording] = useState(defaultRecording);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [fileLevels, setFileLevels] = useState<Map<string, LevelName>>(new Map());
  const [files, setFiles] = useState<string[]>(() => logFileRegistry.getFiles());

  // Union any newly seen file into the sorted set (registry load-time entries and stream entries alike).
  const addFile = useCallback((file: string) => {
    setFiles((prev) => (prev.includes(file) ? prev : [...prev, file].sort()));
  }, []);

  // Track files registered at module load (dev registry), unioned with the initial snapshot.
  useEffect(() => {
    const sync = () => {
      for (const file of logFileRegistry.getFiles()) {
        addFile(file);
      }
    };
    sync();
    return logFileRegistry.subscribe(sync);
  }, [addFile]);

  // Normalize the public prop: a non-positive or non-finite bound would defeat `slice(-capacity)`.
  const capacity = useMemo(
    () => (Number.isFinite(maxLines) && maxLines >= 1 ? Math.floor(maxLines) : DEFAULT_MAX_LINES),
    [maxLines],
  );

  // Monotonic id so list keys stay stable once `slice(-capacity)` drops older rows.
  const nextRowId = useRef(0);

  // Acquire/release the shared global-config ownership across the recording lifetime (ref-counted across panels).
  useEffect(() => {
    if (!recording) {
      return;
    }
    acquireLogConfig();
    return () => releaseLogConfig();
  }, [recording]);

  // Apply the composed filter and capture entries while recording; discover every file regardless of the display filter.
  const effectiveFilter = useMemo(() => composeFilter(filter, fileLevels), [filter, fileLevels]);
  useEffect(() => {
    if (!recording) {
      return;
    }

    log.config({ filter: effectiveFilter });
    const dispose = log.addProcessor((config: LogConfig, entry: LogEntry) => {
      const file = entry.meta?.F;
      if (file) {
        addFile(file);
      }
      if (shouldLog(entry, config.filters)) {
        setRows((prev) => [...prev, { id: nextRowId.current++, entry }].slice(-capacity));
      }
    });

    return () => dispose();
  }, [recording, effectiveFilter, capacity, addFile]);

  // Drop expansion state for evicted rows so the set stays bounded (no-op while nothing is expanded).
  useEffect(() => {
    setExpanded((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const ids = new Set(rows.map((row) => row.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const setFileLevel = useCallback((file: string, level: LevelName | undefined) => {
    setFileLevels((prev) => {
      const next = new Map(prev);
      if (level) {
        next.set(file, level);
      } else {
        next.delete(file);
      }
      return next;
    });
  }, []);
  const clearFileLevels = useCallback(() => setFileLevels(new Map()), []);
  const clear = useCallback(() => {
    setRows([]);
    setExpanded(new Set());
  }, []);
  const copyAll = useCallback(() => {
    copyToClipboard(JSON.stringify(rows.map(({ entry }) => formatLogEntry(entry)), null, 2));
  }, [rows]);
  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  return (
    <LoggerProvider
      rows={rows}
      filter={filter}
      setFilter={setFilter}
      recording={recording}
      setRecording={setRecording}
      files={files}
      fileLevels={fileLevels}
      setFileLevel={setFileLevel}
      clearFileLevels={clearFileLevels}
      expanded={expanded}
      toggleExpand={toggleExpand}
      clear={clear}
      copyAll={copyAll}
    >
      {children}
    </LoggerProvider>
  );
};

LoggerRoot.displayName = 'Logger.Root';

export { useLoggerContext };
