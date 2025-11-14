//
// Copyright 2022 DXOS.org
//

import { type LogConfig, type LogFilter, type LogLevel } from './config';
import { type CallMetadata } from './meta';
import { gatherLogInfoFromScope } from './scope';

/**
 * Optional object passed to the logging API.
 */
export type LogContext = Record<string, any> | Error | any;

/**
 * Record for current log line.
 */
export interface LogEntry {
  level: LogLevel;
  message?: string;
  context?: LogContext;
  meta?: CallMetadata;
  error?: Error;
}

/**
 * Processes (e.g., prints, forwards) log entries.
 */
export type LogProcessor = (config: LogConfig, entry: LogEntry) => void;

/**
 * Returns true if the log entry matches the filter, false if should be excluded, or undefined if it doesn't match the level.
 */
const matchFilter = (filter: LogFilter, level: LogLevel, path?: string): boolean | undefined => {
  if (filter.pattern?.startsWith('-')) {
    // Exclude.
    if (path?.includes(filter.pattern.slice(1))) {
      if (!level || level >= filter.level) {
        return false;
      }
    }
  } else {
    // Include.
    if (level >= filter.level) {
      return true;
    }
    if (filter.pattern) {
      return path?.includes(filter.pattern);
    }
  }
};

/**
 * Determines if the current line should be logged (called by the processor).
 */
export const shouldLog = (entry: LogEntry, filters?: LogFilter[]): boolean => {
  if (filters === undefined) {
    return false;
  }

  const results = filters
    .map((filter) => matchFilter(filter, entry.level, entry.meta?.F))
    .filter((result): result is boolean => result !== undefined);

  if (results.length === 0) {
    return false;
  }

  return results.every((result) => result);
};

export const getContextFromEntry = (entry: LogEntry): Record<string, any> | undefined => {
  let context;
  if (entry.meta) {
    const scopeInfo = gatherLogInfoFromScope(entry.meta.S);
    if (Object.keys(scopeInfo).length > 0) {
      context = Object.assign(context ?? {}, scopeInfo);
    }
  }

  const entryContext = typeof entry.context === 'function' ? entry.context() : entry.context;
  if (entryContext) {
    if (entryContext instanceof Error) {
      // Additional context from Error.
      const c = (entryContext as any).context;
      // If ERROR then show stacktrace.
      context = Object.assign(context ?? {}, { error: entryContext.stack, ...c });
    } else if (typeof entryContext === 'object') {
      context = Object.assign(context ?? {}, entryContext);
    }
  }

  if (entry.error) {
    context = Object.assign(context ?? {}, { error: entry.error });
  }

  return context && Object.keys(context).length > 0 ? context : undefined;
};
