//
// Copyright 2022 DXOS.org
//

import { appendFileSync, mkdirSync, openSync } from 'node:fs';
import { dirname } from 'node:path';

import { LogProcessor } from '../context';
import { gatherLogInfoFromScope } from '../scope';

let fd: number | undefined;

export const FILE_PROCESSOR: LogProcessor = (config, entry) => {
  if (!fd) {
    try {
      mkdirSync(dirname(getLogFilePath()));
    } catch {}
    fd = openSync(getLogFilePath(), 'w');
  }

  const record = {
    ...entry,
    meta: {
      ...entry.meta
    }
  };
  if (record.context) {
    record.context = jsonify(record.context);
  }
  if (record.meta?.scope) {
    record.meta.scope = jsonify(gatherLogInfoFromScope(record.meta.scope));
  }
  delete record.meta?.bugcheck;
  appendFileSync(fd, JSON.stringify(record) + '\n');
};

let logFilePath: string | undefined;
const getLogFilePath = () => {
  logFilePath ??=
    process.env.LOG_FILE ??
    (process.env.HOME ? `${process.env.HOME}/.dxlog/${new Date().toISOString()}.log` : undefined);

  return logFilePath!;
};

/**
 * Recursively converts an object into a JSON-compatible object.
 */
const jsonify = (value: any): any => {
  if (typeof value === 'function') {
    return null;
  } else if (typeof value === 'object' && value !== null) {
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
