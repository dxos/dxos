//
// Copyright 2022 DXOS.org
//

import { LogConfig, LogFilter, LogLevel } from './config';
import { gatherLogInfoFromScope } from './scope';

/**
 * Optional object passed to the logging API.
 */
export type LogContext = Record<string, any> | Error | any;

/**
 * Generated meta data from source map.
 */
// TODO(burdon): Protobuf structure?
export interface LogMetadata {
  file: string;
  line: number;

  /**
   * Value of `this` at the site of the log call.
   * Will be set to the class instance if the call is inside a method, or to the `globalThis` (`window` or `global`) otherwise.
   */
  scope: any | undefined;

  // Useful for pre-processor hook debugging.
  bugcheck?: string;

  /**
   * A callback that will invoke the provided function with provided arguments.
   * Useful in the browser to force a `console.log` call to have a certain stack-trace.
   */
  callSite?: (fn: Function, args: any[]) => void;
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

export const getContextFromEntry = (entry: LogEntry): Record<string, any> | undefined => {
  let context;
  if (entry.meta) {
    const scopeInfo = gatherLogInfoFromScope(entry.meta.scope);
    if (Object.keys(scopeInfo).length > 0) {
      context = Object.assign(context ?? {}, scopeInfo);
    }
  }

  if (entry.context) {
    if (entry.context instanceof Error) {
      // Additional context from Error.
      const c = (entry.context as any).context;
      // If ERROR then show stacktrace.
      context = Object.assign(context ?? {}, { error: entry.context.stack, ...c });
    } else if (typeof entry.context === 'object') {
      context = Object.assign(context ?? {}, entry.context);
    }
  }

  return context && Object.keys(context).length > 0 ? context : undefined;
};
