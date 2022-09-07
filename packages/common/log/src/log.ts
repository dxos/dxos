//
// Copyright 2022 DXOS.org
//

import { LogLevel } from './log-level';
import type { OwnershipScope } from './ownership';
import { CONSOLE_PROCESSOR } from './processors';

export type LogContext = Record<string, any>

export type LogFn = (message: string, ctx?: LogContext, meta?: LogMetadata) => void

export interface Log extends LogFn {
  debug: LogFn
  info: LogFn
  warn: LogFn
  error: LogFn
}

export const log: Log = (...params) => performLog('debug', ...params);

log.debug = (...params) => performLog('debug', ...params);
log.info = (...params) => performLog('info', ...params);
log.warn = (...params) => performLog('warn', ...params);
log.error = (...params) => performLog('error', ...params);

export interface LogMetadata {
  file: string
  line: number
  ownershipScope: OwnershipScope | undefined
  /**
   * Just to help the developer to easily debug preprocessor hook bugs.
   */
  bugcheck?: string
}

export interface LogEntry {
  level: LogLevel
  message: string
  ctx: LogContext | undefined
  meta: LogMetadata | undefined
}

export type LogProcessor = (entry: LogEntry) => void;

let logProcessor: LogProcessor = CONSOLE_PROCESSOR;

export const setProcessor = (processor: LogProcessor) => {
  logProcessor = processor;
};

const performLog = (level: LogLevel, message: string, ctx?: LogContext, meta?: LogMetadata) => {
  logProcessor({
    level,
    message,
    ctx,
    meta
  });
};
