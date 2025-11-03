//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';

import chalk from 'chalk';

import { getPrototypeSpecificInstanceId, pickBy } from '@dxos/util';

import { type LogConfig, LogLevel, shortLevelName } from '../config';
import { type LogProcessor, getContextFromEntry, shouldLog } from '../context';

import { getRelativeFilename } from './common';

const LEVEL_COLORS: Record<LogLevel, typeof chalk.ForegroundColor> = {
  [LogLevel.TRACE]: 'gray',
  [LogLevel.DEBUG]: 'gray',
  [LogLevel.VERBOSE]: 'gray',
  [LogLevel.INFO]: 'white',
  [LogLevel.WARN]: 'yellow',
  [LogLevel.ERROR]: 'red',
};

export const truncate = (text?: string, length = 0, right = false) => {
  const str = text && length ? (right ? text.slice(-length) : text.substring(0, length)) : (text ?? '');
  return right ? str.padStart(length, ' ') : str.padEnd(length, ' ');
};

// TODO(burdon): Optional package name.
// TODO(burdon): Show exceptions on one line.
export type FormatParts = {
  path?: string;
  line?: number;
  timestamp?: string;
  level: LogLevel;
  message?: string;
  context?: any;
  error?: Error;
  scope?: any;
};

export type Formatter = (config: LogConfig, parts: FormatParts) => (string | undefined)[];

export const DEFAULT_FORMATTER: Formatter = (
  config,
  { path, line, level, message, context, error, scope },
): string[] => {
  const column = config.options?.formatter?.column;
  const filepath = path !== undefined && line !== undefined ? chalk.grey(`${path}:${line}`) : undefined;

  let instance;
  if (scope) {
    const prototype = Object.getPrototypeOf(scope);
    if (prototype !== null) {
      const id = getPrototypeSpecificInstanceId(scope);
      instance = chalk.magentaBright(`${prototype.constructor.name}#${id}`);
    }
  }

  const formattedTimestamp = config.options?.formatter?.timestamp ? new Date().toISOString() : undefined;
  const formattedLevel = chalk[LEVEL_COLORS[level]](column ? shortLevelName[level] : LogLevel[level]);
  const padding = column && filepath ? ''.padStart(column - filepath.length) : undefined;

  return config.options?.formatter?.timestampFirst
    ? [formattedTimestamp, filepath, padding, formattedLevel, instance, message, context, error]
    : [
        // NOTE: File path must come fist for console hyperlinks.
        // Must not truncate for terminal output.
        filepath,
        padding,
        formattedTimestamp,
        formattedLevel,
        instance,
        message,
        context,
        error,
      ];
};

export const SHORT_FORMATTER: Formatter = (config, { path, level, message }) => [
  chalk.grey(truncate(path, 16, true)), // NOTE: Breaks terminal linking.
  chalk[LEVEL_COLORS[level]](shortLevelName[level]),
  message,
];

// TODO(burdon): Config option.
const formatter = DEFAULT_FORMATTER;

export const CONSOLE_PROCESSOR: LogProcessor = (config, entry) => {
  const { level, message, meta, error } = entry;
  if (!shouldLog(entry, config.filters)) {
    return;
  }

  const parts: FormatParts = {
    level,
    message,
    error,
    path: undefined,
    line: undefined,
    scope: undefined,
    context: undefined,
  };

  if (meta) {
    parts.path = getRelativeFilename(meta.F);
    parts.line = meta.L;
    parts.scope = meta.S;
  }

  const context = getContextFromEntry(entry);
  if (context) {
    // Remove undefined fields.
    // https://nodejs.org/api/util.html#utilinspectobject-options
    parts.context = inspect(
      pickBy(context, (value?: unknown) => value !== undefined),
      { depth: config.options.depth, colors: true, maxArrayLength: 8, sorted: false },
    );
  }

  const line = formatter(config, parts).filter(Boolean).join(' ');
  console.log(line);
};
