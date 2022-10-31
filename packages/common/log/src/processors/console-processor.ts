//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import { inspect } from 'node:util';

import { LogConfig, LogLevel, shortLevelName } from '../config';
import { LogProcessor, shouldLog } from '../context';

const LEVEL_COLORS: Record<LogLevel, typeof chalk.ForegroundColor> = {
  [LogLevel.DEBUG]: 'gray',
  [LogLevel.INFO]: 'white',
  [LogLevel.WARN]: 'yellow',
  [LogLevel.ERROR]: 'red'
};

export const truncate = (text?: string, length = 0, right = false) => {
  const str = text && length ? (right ? text.slice(-length) : text.substring(0, length)) : text ?? '';
  return right ? str.padStart(length, ' ') : str.padEnd(length, ' ');
};

const getRelativeFilename = (filename: string) => {
  // TODO(burdon): Hack uses "packages" as an anchor (pre-parse NX?)
  // Including `packages/` part of the path so that excluded paths (e.g. from dist) are clickable in vscode.
  const match = filename.match(/.+\/(packages\/.+\/.+)/);
  if (match) {
    const [, filePath] = match;
    return filePath;
  }

  return filename;
};

// TODO(burdon): Optional timestamp.
// TODO(burdon): Optional package name.
// TODO(burdon): Show exceptions on one line.
export type FormatParts = {
  path?: string;
  line?: number;
  level: LogLevel;
  message: string;
  context?: string;
};

export type Formatter = (config: LogConfig, parts: FormatParts) => (string | undefined)[];

export const DEFAULT_FORMATTER: Formatter = (config, { path, line, level, message, context }) => {
  const column = config.options?.formatter?.column;
  const filepath = `${path}:${line}`;
  return [
    // NOTE: File path must come fist for console hyperlinks.
    path !== undefined && line !== undefined ? chalk.grey(filepath) : undefined, // Don't truncate for terminal output.
    column ? ''.padStart(column - filepath.length) : undefined,
    chalk[LEVEL_COLORS[level]](column ? shortLevelName[level] : LogLevel[level]),
    message,
    // NOTE: Must not stringify.
    // TODO(burdon): Substitutions (e.g., replace buffer contents with length?)
    context
  ];
};

export const SHORT_FORMATTER: Formatter = (config, { path, level, message }) => [
  chalk.grey(truncate(path, 16, true)), // NOTE: Breaks terminal linking.
  chalk[LEVEL_COLORS[level]](shortLevelName[level]),
  message
];

// TODO(burdon): Config option.
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

  console.log(formatter(config, parts).filter(Boolean).join(' '));
};
