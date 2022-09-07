import { CONSOLE_PROCESSOR } from "./console-processor"
import { DEBUG_PROCESSOR } from "./debug-processor"
import type { OwnershipScope } from "./ownership"

export type LogCtx = Record<string, any>

export type LogFn = (message: string, ctx?: LogCtx, meta?: LogMetadata) => void

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
  file: string,
  line: number,
  ownershipScope: OwnershipScope | undefined
  /**
   * Just to help the developer to easily debug preprocessor hook bugs.
   */
  bugcheck?: string
}

export type LogLevel =
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  ctx: LogCtx | undefined,
  meta: LogMetadata | undefined
}

export type LogProcessor = (entry: LogEntry) => void;

let logProcessor: LogProcessor = CONSOLE_PROCESSOR;

export function setProcessor(processor: LogProcessor) {
  logProcessor = processor;
}

export function logLevelIndex(level: LogLevel): number {
  switch (level) {
    case 'debug':
      return 0;
    case 'info':
      return 1;
    case 'warn':
      return 2;
    case 'error':
      return 3;
    default:
      return 0;
  }
}

function performLog(level: LogLevel, message: string, ctx?: LogCtx, meta?: LogMetadata) {
    logProcessor({
      level,
      message,
      ctx,
      meta
    })
}
