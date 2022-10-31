//
// Copyright 2022 DXOS.org
//

import { LogProcessor } from './context';

/**
 * Standard levels.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export const levels: { [index: string]: LogLevel } = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR
};

export const shortLevelName = {
  [LogLevel.DEBUG]: 'D',
  [LogLevel.INFO]: 'I',
  [LogLevel.WARN]: 'W',
  [LogLevel.ERROR]: 'E'
};

export enum LogProcessorType {
  CONSOLE = 'console',
  DEBUG = 'debug'
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
  processor?: string | LogProcessorType;
  formatter?: {
    column: number;
  };
};

/**
 * Runtime config.
 */
export interface LogConfig {
  options: LogOptions;
  filters?: LogFilter[];
  processor: LogProcessor;
}
