//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import defaultsDeep from 'lodash.defaultsdeep';

import type { OwnershipScope } from './ownership';

export interface LogMetadata {
  file: string;
  line: number;
  ownershipScope: OwnershipScope | undefined;
  /**
   * Just to help the developer to easily debug preprocessor hook bugs.
   */
  bugcheck?: string;
}

export type LogContext = Record<string, any>;

export interface LogEntry {
  level: LogLevel;
  message: string;
  ctx?: LogContext;
  meta?: LogMetadata;
  error?: Error;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

const levels: { [index: string]: LogLevel } = {
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

export const parseLogLevel = (level: string, defValue = LogLevel.WARN) => levels[level.toLowerCase()] ?? defValue;

export type LogProcessor = (config: LogConfig, entry: LogEntry) => void;

export enum LogProcessorType {
  CONSOLE = 'console',
  DEBUG = 'debug'
}

//
// Config
//

type LogFilter = {
  level: LogLevel,
  pattern?: string
};

export interface LogConfig {
  config?: any;
  processor?: string;
  filter?: string | LogLevel;
}

export type ConfigOptions = {
  processor?: string;
  filter?: string[];
  column?: number;
};

export const defaultConfig: LogConfig = {
  processor: LogProcessorType.CONSOLE,
  filter: LogLevel[LogLevel.INFO]
};

const loadConfig = (filepath?: string): ConfigOptions | undefined => {
  if (filepath) {
    const text = fs.readFileSync(filepath, 'utf-8');
    if (text) {
      return yaml.load(text) as ConfigOptions;
    }
  }
};

export const getDefaultConfig = (): LogConfig => {
  if ('process' in globalThis) {
    return defaultsDeep({
      processor: process!.env?.LOG_PROCESSOR,
      filter: process!.env?.LOG_FILTER,
      config: loadConfig(process!.env?.LOG_CONFIG)
    }, defaultConfig);
  } else {
    return defaultConfig;
  }
};

export const shouldLog = (config: LogConfig, level: LogLevel, path: string): boolean => {
  if (config.filter === undefined) {
    return true;
  }

  // TODO(burdon): Cache as part of config object.
  const filters: LogFilter[] =
    typeof config.filter === 'number'
      ? [{ level: config.filter }]
      : config.filter.split(/,\s*/).map((filter) => {
          const [pattern, level] = filter.split(':');
          return level
            ? {
                level: parseLogLevel(level),
                pattern
              }
            : {
                level: parseLogLevel(pattern)
              };
        });

  return filters.some((filter) => (level >= filter.level) && (!filter.pattern || path.includes(filter.pattern)));
};
