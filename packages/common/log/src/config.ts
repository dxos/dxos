//
// Copyright 2022 DXOS.org
//

import type { OwnershipScope } from './ownership';

export interface LogMetadata {
  file: string
  line: number
  ownershipScope: OwnershipScope | undefined
  /**
   * Just to help the developer to easily debug preprocessor hook bugs.
   */
  bugcheck?: string
}

export type LogContext = Record<string, any>

export interface LogEntry {
  level: LogLevel
  message: string
  ctx?: LogContext
  meta?: LogMetadata
  error?: Error
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

const levels: {[index: string]: LogLevel} = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR
};

export const shortLevelName = {
  [LogLevel.DEBUG]: 'DBG',
  [LogLevel.INFO]: 'INF',
  [LogLevel.WARN]: 'WRN',
  [LogLevel.ERROR]: 'ERR'
};

export const parseLogLevel = (level: string, defValue = LogLevel.WARN) => levels[level.toLowerCase()] ?? defValue;

export type LogProcessor = (config: LogConfig, entry: LogEntry) => void

export enum LogProcessorType {
  CONSOLE = 'console',
  DEBUG = 'debug'
}

//
// Config
//

export interface LogConfig {
  processor?: string
  filter?: string | LogLevel
}

export const defaultConfig: LogConfig = {
  processor: ('process' in globalThis ? process!.env?.LOG_PROCESSOR : undefined) ?? LogProcessorType.CONSOLE,
  filter: ('process' in globalThis ? process!.env?.LOG_FILTER : undefined) ?? LogLevel[LogLevel.INFO]
};

export const shouldLog = (config: LogConfig, level: LogLevel, path: string): boolean => {
  if (config.filter === undefined) {
    return true;
  }

  // TODO(burdon): Cache as part of config object.
  const filters = (typeof config.filter === 'number')
    ? [{ level: config.filter }]
    : config.filter
      .split(/,\s+/)
      .map(filter => {
        const [pattern, level] = filter.split(':');
        return level ? {
          level: parseLogLevel(level),
          pattern
        } : {
          level: parseLogLevel(pattern)
        };
      });

  return filters.some(filter => level >= filter.level && (!filter.pattern || path.includes(filter.pattern)));
};
