//
// Copyright 2023 DXOS.org
//

import { appendFileSync, mkdirSync, openSync } from 'node:fs';
import { dirname } from 'node:path';

import { jsonify } from '@dxos/util';

import { LogLevel } from '../config';
import { LogProcessor, getContextFromEntry } from '../context';

export const createFileProcessor = ({ path, levels }: { path: string; levels: LogLevel[] }): LogProcessor => {
  let fd: number | undefined;

  return (config, entry) => {
    if (!levels.includes(entry.level)) {
      return;
    }
    if (!fd) {
      try {
        mkdirSync(dirname(path));
      } catch {}
      fd = openSync(path, 'w');
    }

    const record = {
      ...entry,
      timestamp: Date.now(),
      meta: {
        ...entry.meta,
      },
      context: jsonify(getContextFromEntry(entry)),
    };
    delete record.meta?.bugcheck;
    delete record.meta?.scope;
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
