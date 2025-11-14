//
// Copyright 2022 DXOS.org
//

import { type LogProcessor } from './context';

/**
 * Standard levels.
 * NOTE: Keep aligned with LogLevel in @dxos/protocols.
 */
// TODO(burdon): Update numbers?
export enum LogLevel {
  TRACE = 5,
  DEBUG = 10,
  VERBOSE = 11,
  INFO = 12,
  WARN = 13,
  ERROR = 14,
}

export const levels: Record<string, LogLevel> = {
  '*': LogLevel.TRACE,
  trace: LogLevel.TRACE,
  debug: LogLevel.DEBUG,
  verbose: LogLevel.VERBOSE,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

export const shortLevelName = {
  [LogLevel.TRACE]: 'T',
  [LogLevel.DEBUG]: 'D',
  [LogLevel.VERBOSE]: 'V',
  [LogLevel.INFO]: 'I',
  [LogLevel.WARN]: 'W',
  [LogLevel.ERROR]: 'E',
};

export enum LogProcessorType {
  CONSOLE = 'console',
  BROWSER = 'browser',
  DEBUG = 'debug',
}

/**
 * Individual filter condition.
 */
export type LogFilter = {
  level: LogLevel;
  pattern?: string;
};

/**
 * Options to set inline or load from the YML file.
 */
export type LogOptions = {
  file?: string;
  filter?: string | string[] | LogLevel;
  captureFilter?: string | string[] | LogLevel;
  depth?: number; // Context object depth.
  processor?: string | LogProcessorType;
  formatter?: {
    column: number;
    timestamp: boolean;
    timestampFirst: boolean;
  };
  prefix?: string;
};

/**
 * Runtime config.
 */
export interface LogConfig {
  options: LogOptions;
  filters?: LogFilter[];
  captureFilters?: LogFilter[];
  processors: LogProcessor[];
  prefix?: string;
}
