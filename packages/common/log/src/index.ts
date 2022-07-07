import { inspect } from "util"
import { OwnershipScope } from "./ownership"

export interface LogMetadata {
  file: string,
  line: number,
  ownershipScope: OwnershipScope | undefined
}

export interface LogEntry {
  level: LogLevel
  message: readonly string[]
  params: any[],
  ctx: any | undefined,
  meta: LogMetadata | undefined
}

export type LogProcessor = (entry: LogEntry) => void;

const debugProcessor: LogProcessor = entry => {
  console.log(inspect(entry, false, null, true))
}

const logProcessor: LogProcessor = debugProcessor;

export type LogLevel =
  | 'info'
  | 'warn'
  | 'error'

type LogCont = (ctx?: Record<string, any>, meta?: LogMetadata) => void

function performLog(level: LogLevel, message: TemplateStringsArray, params: any[]): LogCont {
  return (ctx, meta) => {
    logProcessor({
      level,
      message,
      params,
      ctx,
      meta
    })
  }
}

export interface Log {
  (message: TemplateStringsArray, ...params: any[]): LogCont
  info (message: TemplateStringsArray, ...params: any[]): LogCont
  warn (message: TemplateStringsArray, ...params: any[]): LogCont
  error (message: TemplateStringsArray, ...params: any[]): LogCont
}

export const log: Log = (message, ...params) => performLog('info', message, params);
log.info = (message, ...params) => performLog('info', message, params);
log.warn = (message, ...params) => performLog('warn', message, params);
log.error = (message, ...params) => performLog('error', message, params);