//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import { inspect } from 'util';

import { LogLevel, LogProcessor, shouldLog } from '../config';

const LEVEL_COLORS: Record<LogLevel, typeof chalk.ForegroundColor> = {
  [LogLevel.DEBUG]: 'gray',
  [LogLevel.INFO]: 'white',
  [LogLevel.WARN]: 'yellow',
  [LogLevel.ERROR]: 'red'
};

export const truncate = (text?: string, length = 0, right = false) => {
  const str = (text && length) ? (right ? text.slice(-length) : text.substring(0, length)) : text ?? '';
  return right ? str.padStart(length, ' ') : str.padEnd(length, ' ');
};

// TODO(burdon): Optional timestamp.
// TODO(burdon): Optional package name.
// TODO(burdon): Show exceptions on one line.
export type FormatParts = {
  path?: string
  line?: number
  level: LogLevel
  message: string
  context?: string
}

export const DEFAULT_FORMATTER = ({ path, line, level, message, context }: FormatParts): (string | undefined)[] => ([
  chalk.grey(`${path}:${line}`), // Don't truncate for terminal output.
  chalk[LEVEL_COLORS[level]](LogLevel[level]),
  message,
  context
]);

export const SHORT_FORMATTER = ({ path, line, level, message, context }: FormatParts): (string | undefined)[] => ([
  chalk.grey(truncate(path, 16, true)), // NOTE: Breaks terminal linking.
  chalk[LEVEL_COLORS[level]](LogLevel[level][0]),
  message
]);

// TODO(burdon): Config.
const formatter = DEFAULT_FORMATTER;

export const CONSOLE_PROCESSOR: LogProcessor = (config, entry) => {
  if (!shouldLog(config, entry.level, entry.meta?.file ?? '')) {
    return;
  }

  const parts: FormatParts = {
    level: entry.level,
    message: entry.message
  };

  if (entry.meta) {
    parts.path = getRelativeFilename(entry.meta.file);
    parts.line = entry.meta.line;
  }

  if (entry.ctx && Object.keys(entry.ctx).length > 0) {
    parts.context = inspect(entry.ctx, false, undefined, true);
  }

  console.log(formatter(parts).filter(Boolean).join(' '));
};

const getRelativeFilename = (filename: string) => {
  // TODO(burdon): Hack uses "packages" as an anchor (pre-parse NX?)
  const match = filename.match(/.+\/packages\/(.+\/.+)/);
  if (match) {
    const [, filePath] = match;
    return filePath;
  }

  return filename;
};
