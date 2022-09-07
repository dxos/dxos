//
// Copyright 2022 DXOS.org
//

import {
  defaultConfig,
  LogConfig,
  LogContext,
  LogLevel,
  LogMetadata,
  LogProcessor,
  LogProcessorType
} from './config';
import { CONSOLE_PROCESSOR, DEBUG_PROCESSOR } from './processors';

export type Logger = (message: string, ctx?: LogContext, meta?: LogMetadata) => void

export interface Log extends Logger {
  config: LogConfig

  debug: Logger
  info: Logger
  warn: Logger
  error: Logger
}

export const log: Log = (...params) => processLog(LogLevel.DEBUG, ...params);

log.config = defaultConfig;

log.debug = (...params) => processLog(LogLevel.DEBUG, ...params);
log.info = (...params) => processLog(LogLevel.INFO, ...params);
log.warn = (...params) => processLog(LogLevel.WARN, ...params);
log.error = (...params) => processLog(LogLevel.ERROR, ...params);

export const processors: {[index: string]: LogProcessor} = {
  [LogProcessorType.CONSOLE]: CONSOLE_PROCESSOR,
  [LogProcessorType.DEBUG]: DEBUG_PROCESSOR
};

const processLog = (level: LogLevel, message: string, ctx?: LogContext, meta?: LogMetadata) => {
  const processor = processors[log.config.processor!] ?? CONSOLE_PROCESSOR;
  processor(log.config, {
    level,
    message,
    ctx,
    meta
  });
};
