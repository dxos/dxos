//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
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

const loadOptions = (filepath?: string): LogOptions | undefined => {
  if (filepath) {
    const text = fs.readFileSync(filepath, 'utf-8');
    if (text) {
      return yaml.load(text) as LogOptions;
    }
  }
};

export const parseFilter = (filter: string | string[] | LogLevel): LogFilter[] => {
  if (typeof filter === 'number') {
    return [{ level: filter }];
  }

  const lines = typeof filter === 'string' ? filter.split(/,\s*/) : filter;

  const parseLogLevel = (level: string, defValue = LogLevel.WARN) => levels[level.toLowerCase()] ?? defValue;

  return lines.map((filter) => {
    const [pattern, level] = filter.split(':');
    return level ? { level: parseLogLevel(level), pattern } : { level: parseLogLevel(pattern) };
  });
};

export const getConfig = (_options?: LogOptions): LogConfig => {
  let options: LogOptions = defaultsDeep(
    {},
    _options,
    'process' in globalThis && {
      file: process!.env?.LOG_CONFIG,
      filter: process!.env?.LOG_FILTER,
      processor: process!.env?.LOG_PROCESSOR
    }
  );

  if (options.file) {
    options = defaultsDeep(options, loadOptions(options.file));
  }

  return {
    options,
    filters: parseFilter(options.filter ?? LogLevel.INFO),
    processor: options.processor ? processors[options.processor] : CONSOLE_PROCESSOR
  };
};
