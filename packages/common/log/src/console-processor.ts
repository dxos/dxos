import { inspect } from "util";
import { LogLevel, logLevelIndex, LogProcessor } from "./log";
import chalk from 'chalk'

const minLogLevel = logLevelIndex((process.env.DX_LOG_LEVEL?.toLowerCase() ?? 'info') as LogLevel);

export const CONSOLE_PROCESSOR: LogProcessor = entry => {
  if (logLevelIndex(entry.level) < minLogLevel) {
    return;
  }

  const level = chalk[LEVEL_COLORS[entry.level]](entry.level.toUpperCase().padEnd(5));

  let buffer = '';

  if (entry.meta) {
    const filename = getRelativeFilename(entry.meta.file)
    buffer += chalk.gray(`${filename}:${entry.meta.line} `);
  }

  buffer += `${level} ${entry.message}`;

  if(entry.ctx && Object.keys(entry.ctx).length > 0) {
    buffer += ' '
    buffer += inspect(entry.ctx, false, undefined, true);
  }

  console.log(buffer);
}

const LEVEL_COLORS: Record<LogLevel, typeof chalk.ForegroundColor> = {
  debug: 'blue',
  info: 'white',
  warn: 'yellow',
  error: 'red'
}

const getRelativeFilename = (filename: string) => {
  // Very ugly, I know. But it works, and I couldn't find a better way to do it easily.
  if(filename.includes('/packages/')) {
    return filename.slice(filename.indexOf('/packages/') + '/packages/'.length);
  }
  return filename
}