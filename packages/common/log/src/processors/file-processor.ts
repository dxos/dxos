//
// Copyright 2023 DXOS.org
//

import { appendFileSync, mkdirSync, openSync } from 'node:fs';
import { dirname } from 'node:path';

import { LogLevel } from '../config';
import { LogProcessor, getContextFromEntry } from '../context';

export const createFileProcessor = ({ path, level }: { path: string; level: LogLevel }): LogProcessor => {
  let fd: number | undefined;

  return (config, entry) => {
    if (entry.level < level) {
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

export const FILE_PROCESSOR: LogProcessor = createFileProcessor({ path: getLogFilePath(), level: LogLevel.TRACE });

/**
 * Recursively converts an object into a JSON-compatible object.
 */
export const jsonify = (value: any): any => {
  if (typeof value === 'function') {
    return null;
  } else if (typeof value === 'object' && value !== null) {
    if (value instanceof Uint8Array) {
      return Buffer.from(value).toString('hex');
    }
    if (Array.isArray(value)) {
      return value.map(jsonify);
    } else {
      if (typeof value.toJSON === 'function') {
        return value.toJSON();
      }
      const res: any = {};
      for (const key of Object.keys(value)) {
        res[key] = jsonify(value[key]);
      }
      return res;
    }
  } else {
    return value;
  }
};
