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
 * @param path - Path to the log file or 'stdout' or 'stderr'.
 * @param levels - Log levels to process. Takes preference over Filters.
 * @param filters - Filters to apply.
 */
export const createFileProcessor = ({
  path,
  levels,
  filters,
}: {
  path: string;
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
    if (!fd) {
      switch (path) {
        case 'stdout':
          fd = 1;
          break;
        case 'stderr':
          fd = 2;
          break;
        default:
          try {
            mkdirSync(dirname(path));
          } catch {}
          fd = openSync(path, 'w');
      }
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
  path: getLogFilePath(),
  levels: [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.TRACE],
});
