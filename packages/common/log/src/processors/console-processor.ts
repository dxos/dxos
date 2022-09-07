//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import { inspect } from 'util';

import { LogLevel, LogProcessor, shouldLog } from '../config';

const LEVEL_COLORS: Record<LogLevel, typeof chalk.ForegroundColor> = {
  [LogLevel.DEBUG]: 'blue',
  [LogLevel.INFO]: 'white',
  [LogLevel.WARN]: 'yellow',
  [LogLevel.ERROR]: 'red'
};

export const CONSOLE_PROCESSOR: LogProcessor = (config, entry) => {
  if (!shouldLog(config, entry.level, entry.meta?.file ?? '')) {
    return;
  }

  // TODO(burdon): Optional timestamp.
  const parts = [];

  // TODO(burdon): Optional fixed width, right-align.
  if (entry.meta) {
    const filename = getRelativeFilename(entry.meta.file);
    parts.push(chalk.gray(`${filename}:${entry.meta.line}`));
  }

  const level = chalk[LEVEL_COLORS[entry.level]](LogLevel[entry.level].toUpperCase().padEnd(5));
  parts.push(level);

  parts.push(entry.message);

  if (entry.ctx && Object.keys(entry.ctx).length > 0) {
    parts.push(inspect(entry.ctx, false, undefined, true));
  }

  console.log(parts.join(' '));
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
