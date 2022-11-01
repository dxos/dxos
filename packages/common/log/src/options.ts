//
// Copyright 2022 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { LogConfig, LogFilter, LogLevel, LogOptions, LogProcessorType, levels } from './config';
import { LogProcessor } from './context';
import { CONSOLE_PROCESSOR, DEBUG_PROCESSOR } from './processors';

/**
 * Processor variants.
 */
export const processors: { [index: string]: LogProcessor } = {
  [LogProcessorType.CONSOLE]: CONSOLE_PROCESSOR,
  [LogProcessorType.DEBUG]: DEBUG_PROCESSOR
};

export const parseFilter = (filter: string | string[] | LogLevel): LogFilter[] => {
  if (typeof filter === 'number') {
    return [{ level: filter }];
  }

  const parseLogLevel = (level: string, defValue = LogLevel.WARN) => levels[level.toLowerCase()] ?? defValue;

  const lines = typeof filter === 'string' ? filter.split(/,\s*/) : filter;
  return lines.map((filter) => {
    const [pattern, level] = filter.split(':');
    return level ? { level: parseLogLevel(level), pattern } : { level: parseLogLevel(pattern) };
  });
};

export const getConfig = (_options?: LogOptions): LogConfig => {
  const options: LogOptions = defaultsDeep(
    {},
    _options,
    'process' in globalThis && {
      // TODO(burdon): Node only.
      file: process!.env?.LOG_CONFIG,
      filter: process!.env?.LOG_FILTER,
      processor: process!.env?.LOG_PROCESSOR
    }
  );

  if (options.file) {
    // TODO(burdon): Node only.
    // options = defaultsDeep(options, loadOptions(options.file));
  }

  return {
    options,
    filters: parseFilter(options.filter ?? LogLevel.INFO),
    processor: options.processor ? processors[options.processor] : CONSOLE_PROCESSOR
  };
};
