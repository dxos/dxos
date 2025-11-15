//
// Copyright 2022 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { type LogConfig, type LogFilter, LogLevel, type LogOptions, LogProcessorType, levels } from './config';
import { type LogProcessor } from './context';
import { loadOptions } from './platform';
import { BROWSER_PROCESSOR, CONSOLE_PROCESSOR, DEBUG_PROCESSOR } from './processors';

/**
 * Processor variants.
 */
export const processors: Record<string, LogProcessor> = {
  [LogProcessorType.CONSOLE]: CONSOLE_PROCESSOR,
  [LogProcessorType.BROWSER]: BROWSER_PROCESSOR,
  [LogProcessorType.DEBUG]: DEBUG_PROCESSOR,
};

const browser = typeof window !== 'undefined' || typeof navigator !== 'undefined';

export const DEFAULT_PROCESSORS = [browser ? BROWSER_PROCESSOR : CONSOLE_PROCESSOR];

const parseLogLevel = (level: string, defValue = LogLevel.WARN) => levels[level.toLowerCase()] ?? defValue;

/**
 * @internal
 */
export const parseFilter = (filter: string | string[] | LogLevel): LogFilter[] => {
  if (typeof filter === 'number') {
    return [{ level: filter }];
  }

  const lines = typeof filter === 'string' ? filter.split(/,\s*/) : filter;
  return lines.map((filter) => {
    const [pattern, level] = filter.split(':');
    return level
      ? {
          level: parseLogLevel(level),
          pattern,
        }
      : {
          level: parseLogLevel(pattern),
        };
  });
};

/**
 * @internal
 */
export const createConfig = (options?: LogOptions): LogConfig => {
  // Node only.
  const envOptions: LogOptions | undefined =
    'process' in globalThis
      ? {
          file: process!.env.LOG_CONFIG,
          filter: process!.env.LOG_FILTER,
          processor: process!.env.LOG_PROCESSOR,
        }
      : undefined;

  const mergedOptions: LogOptions = defaultsDeep({}, loadOptions(envOptions?.file), envOptions, options);
  return {
    options: mergedOptions,
    filters: parseFilter(mergedOptions.filter ?? LogLevel.INFO),
    captureFilters: parseFilter(mergedOptions.captureFilter ?? LogLevel.WARN),
    processors: mergedOptions.processor ? [processors[mergedOptions.processor]] : [...DEFAULT_PROCESSORS],
    prefix: mergedOptions.prefix,
  };
};
