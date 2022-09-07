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
  ctx: LogContext | undefined
  meta: LogMetadata | undefined
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

export const parseLogLevel = (level: string, defValue = LogLevel.WARN) => levels[level.toLowerCase()] ?? defValue;

export type LogProcessor = (config: LogConfig, entry: LogEntry) => void;

export enum LogProcessorType {
  CONSOLE = 'console',
  DEBUG = 'debug'
}

//
// Config
//

export interface LogConfig {
  processor?: string
  filter?: string // DX_LOG
}

export const defaultConfig: LogConfig = {
  processor: ('process' in globalThis ? process!.env?.LOG_PROCESSOR : undefined) ?? LogProcessorType.CONSOLE,
  filter: ('process' in globalThis ? process!.env?.LOG_FILTER : undefined) ?? LogLevel[LogLevel.WARN]
};

export const shouldLog = (config: LogConfig, level: LogLevel, path: string): boolean => {
  if (!config.filter) {
    return false;
  }

  // TODO(burdon): Cache as part of config object.
  const filters = config.filter
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
