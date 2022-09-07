import { inspect } from "util";
import { LogProcessor } from "./log";
import chalk from 'chalk'
import { LogLevel, logLevelIndex } from "./log-level";

export const CONSOLE_PROCESSOR: LogProcessor = entry => {
  if (!shouldLog(entry.level, entry.meta?.file ?? '')) {
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

const logFilter = ('process' in globalThis ? process?.env?.DX_LOG : undefined) ?? 'warn';

const parsedFilters = logFilter.split(',').map(filter => {
  if(!filter.includes(':')) {
    return {
      level: logLevelIndex(filter as LogLevel),
      pattern: undefined
    }
  }

  const [pattern, level] = filter.split(':');
  return {
    level: logLevelIndex(level as LogLevel),
    pattern,
  }
})

function shouldLog(level: LogLevel, path: string): boolean {
  const levelIndex = logLevelIndex(level);
  return parsedFilters.some(filter => filter.pattern ? path.includes(filter.pattern) && levelIndex >= filter.level : levelIndex >= filter.level);
}