//
// Copyright 2023 DXOS.org
//

import { appendFileSync, mkdirSync, openSync } from 'node:fs';
import { dirname } from 'node:path';

import { getPrototypeSpecificInstanceId, jsonlogify } from '@dxos/util';

import { getRelativeFilename } from './common';
import { type LogFilter, LogLevel } from '../config';
import { type LogProcessor, getContextFromEntry, shouldLog, type LogEntry } from '../context';

// Amount of time to retry writing after encountering EAGAIN before giving up.
const EAGAIN_MAX_DURATION = 1000;

export enum LogEntryFormat {
  JSON = 'json',
  TEXT = 'text',
}

export type FileProcessorConfig = {
  pathOrFd: string | number;
  levels: LogLevel[];
  filters?: LogFilter[];
  entryFormat?: LogEntryFormat;
};

type LogEntryFormatter = (entry: LogEntry) => string;

const JSON_FORMATTER: LogEntryFormatter = (entry) => {
  const record = {
    ...entry,
    timestamp: Date.now(),
    ...(entry.meta ? { meta: { file: getRelativeFilename(entry.meta.F), line: entry.meta.L } } : {}),
    context: jsonlogify(getContextFromEntry(entry)),
  };
  return JSON.stringify(record);
};

const TEXT_FORMATTER: LogEntryFormatter = (entry) => {
  const parts: string[] = [];
  const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
  parts.push(timestamp);
  if (entry.meta?.F) {
    const pathSegments = entry.meta.F.split('/');
    parts.push(pathSegments[pathSegments.length - 1]);
  }
  parts.push(LogLevel[entry.level]);
  if (entry.meta?.S) {
    const prototype = Object.getPrototypeOf(entry.meta.S);
    const id = getPrototypeSpecificInstanceId(entry.meta.S);
    parts.push(`${prototype.constructor.name}#${id}`);
  }
  parts.push(entry.message);

  const entryContext = getContextFromEntry(entry);
  if (entryContext) {
    parts.push('\n', JSON.stringify(jsonlogify(entryContext)));
  }
  return parts.join(' ');
};

const logFormatters: { [key in LogEntryFormat]: LogEntryFormatter } = {
  json: JSON_FORMATTER,
  text: TEXT_FORMATTER,
};

/**
 * Create a file processor.
 * @param path - Path to log file to create or append to, or existing open file descriptor e.g. stdout.
 * @param levels - Log levels to process. Takes preference over Filters.
 * @param filters - Filters to apply.
 */
export const createFileProcessor = ({ pathOrFd, levels, filters, entryFormat }: FileProcessorConfig): LogProcessor => {
  let fd: number | undefined;
  const formatter = logFormatters[entryFormat ?? LogEntryFormat.JSON];

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
      fd = openSync(pathOrFd, 'a');
    }

    let retryTS: number = 0;

    // Retry writing if EAGAIN is encountered.
    //
    // Node may set stdout and stderr to non-blocking. https://github.com/nodejs/node/issues/42826
    // This can cause EAGAIN errors when writing to them.
    // In order to not drop logs, make log methods asynchronous, or deal with buffering/delayed writes, spin until write succeeds.
    const formattedEntry = formatter(entry);
    while (true) {
      try {
        return appendFileSync(fd, formattedEntry + '\n');
      } catch (err: any) {
        if (err.code !== 'EAGAIN') {
          throw err;
        }
        if (retryTS === 0) {
          retryTS = performance.now();
        } else {
          if (performance.now() - retryTS > EAGAIN_MAX_DURATION) {
            console.log(`could not write after ${EAGAIN_MAX_DURATION}ms of EAGAIN failures, giving up`);
            throw err;
          }
        }
      }
    }
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
