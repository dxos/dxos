//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import { inspect } from 'node:util';

import { ConfigOptions, LogLevel, LogProcessor, shortLevelName, shouldLog } from '../config';

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

export type Format = (parts: FormatParts, options: ConfigOptions) => (string | undefined)[];

// TODO(burdon): File path must come fist for console hyperlinks?
export const DEFAULT_FORMATTER: Format = ({ path, line, level, message, context }, { column } = {}) => {
  const filepath = `${path}:${line}`;
  return [
    path !== undefined && line !== undefined ? chalk.grey(filepath) : undefined, // Don't truncate for terminal output.
    column ? ''.padStart(column - filepath.length) : undefined,
    chalk[LEVEL_COLORS[level]](column ? shortLevelName[level] : LogLevel[level]),
    message,
    context
  ];
};

export const SHORT_FORMATTER: Format = ({ path, level, message }) => [
  chalk.grey(truncate(path, 16, true)), // NOTE: Breaks terminal linking.
  chalk[LEVEL_COLORS[level]](shortLevelName[level]),
  message
];

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

  console.log(formatter(parts, config.config).filter(Boolean).join(' '));
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
