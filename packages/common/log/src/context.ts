//
// Copyright 2022 DXOS.org
//

import { LogConfig, LogFilter, LogLevel } from './config';
import { OwnershipScope } from './ownership';

/**
 * Optional object passed to the logging API.
 */
export type LogContext = Record<string, any> | Error | any;

/**
 * Generated meta data from source map.
 */
export interface LogMetadata {
  file: string;
  line: number;

  // TODO(burdon): Document.
  ownershipScope: OwnershipScope | undefined;

  // Useful for pre-processor hook debugging.
  bugcheck?: string;
}

/**
 * Record for current log line.
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  meta?: LogMetadata;
  error?: Error;
}

/**
 * Processes (e.g., prints, forwards) log entries.
 */
export type LogProcessor = (config: LogConfig, entry: LogEntry) => void;

const matchFilter = (filter: LogFilter, level: LogLevel, path: string) => {
  return level >= filter.level && (!filter.pattern || path.includes(filter.pattern));
};

/**
 * Determines if the current line should be logged (called by the processor).
 */
export const shouldLog = (config: LogConfig, level: LogLevel, path: string): boolean => {
  if (config.filters === undefined) {
    return true;
  } else {
    return config.filters.some((filter) => matchFilter(filter, level, path));
  }
};
