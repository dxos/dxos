//
// Copyright 2023 DXOS.org
//

import { appendFileSync, mkdirSync, openSync } from 'node:fs';
import { dirname } from 'node:path';

import { jsonify } from '@dxos/util';

import { type LogFilter, LogLevel } from '../config';
import { type LogProcessor, getContextFromEntry, shouldLog } from '../context';

/**
 * Create a file processor.
 * @param path - Path to log file to create or append to, or existing open file descriptor e.g. stdout.
 * @param levels - Log levels to process. Takes preference over Filters.
 * @param filters - Filters to apply.
 */
export const createFileProcessor = ({
  pathOrFd,
  levels,
  filters,
}: {
  pathOrFd: string | number;
  levels: LogLevel[];
  filters?: LogFilter[];
}): LogProcessor => {
  let fd: number | undefined;

  return (config, entry) => {
    if (levels.length > 0 && !levels.includes(entry.level)) {
      return;
    }
    if (!shouldLog(entry, filters)) {
      return;
    }
    if (typeof pathOrFd === 'number') {
      fd = pathOrFd;
    } else {
      try {
        mkdirSync(dirname(pathOrFd));
      } catch {}
      fd = openSync(pathOrFd, 'w');
    }

    const record = {
      ...entry,
      timestamp: Date.now(),
      meta: {
        file: entry.meta?.F,
        line: entry.meta?.L,
      },
      context: jsonify(getContextFromEntry(entry)),
    };
    appendFileSync(fd, JSON.stringify(record) + '\n');
  };
};

let logFilePath: string | undefined;
const getLogFilePath = () => {
  logFilePath ??=
    process.env.LOG_FILE ??
    (process.env.HOME ? `${process.env.HOME}/.dxlog/${new Date().toISOString()}.log` : undefined);

  return logFilePath!;
};

export const FILE_PROCESSOR: LogProcessor = createFileProcessor({
  pathOrFd: getLogFilePath(),
  levels: [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.TRACE],
});
