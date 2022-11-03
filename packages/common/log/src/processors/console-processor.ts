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
  context?: any;
  error?: Error;
};

export type Formatter = (config: LogConfig, parts: FormatParts) => (string | undefined)[];

export const DEFAULT_FORMATTER: Formatter = (config, { path, line, level, message, context, error }) => {
  const column = config.options?.formatter?.column;

  const filepath = path !== undefined && line !== undefined ? chalk.grey(`${path}:${line}`) : undefined;

  return [
    // NOTE: File path must come fist for console hyperlinks.
    // Must not truncate for terminal output.
    filepath,
    column && filepath ? ''.padStart(column - filepath.length) : undefined,
    chalk[LEVEL_COLORS[level]](column ? shortLevelName[level] : LogLevel[level]),
    message,
    context,
    error
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
  const { level, message, context, meta, error } = entry;
  if (!shouldLog(config, level, meta?.file ?? '')) {
    return;
  }

  const parts: FormatParts = { level, message, error };

  if (meta) {
    parts.path = getRelativeFilename(meta.file);
    parts.line = meta.line;
  }

  if ((context && Object.keys(context).length > 0) || context instanceof Error) {
    parts.context = inspect(context, false, undefined, true);
  }

  const line = formatter(config, parts).filter(Boolean).join(' ');
  console.log(line);
};
