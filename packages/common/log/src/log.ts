//
// Copyright 2022 DXOS.org
//

import { LogOptions, LogConfig, LogLevel } from './config';
import { LogContext, LogMetadata } from './context';
import { getConfig } from './options';

/**
 * Logging function.
 */
type Logger = (message: string, context?: LogContext, meta?: LogMetadata) => void;

/**
 * Properties accessible on the logging function.
 */
interface Log extends Logger {
  config: (options: LogOptions) => void;

  debug: Logger;
  info: Logger;
  warn: Logger;
  error: Logger;

  catch: (error: Error, context?: LogContext, meta?: LogMetadata) => void;
}

interface LogImp extends Log {
  _config: LogConfig;
}

const createLog = (): LogImp => {
  const log: LogImp = (...params) => processLog(LogLevel.DEBUG, ...params);

  log._config = getConfig();

  log.config = (options: LogOptions) => {
    log._config = getConfig(options);
  };

  log.debug = (...params) => processLog(LogLevel.DEBUG, ...params);
  log.info = (...params) => processLog(LogLevel.INFO, ...params);
  log.warn = (...params) => processLog(LogLevel.WARN, ...params);
  log.error = (...params) => processLog(LogLevel.ERROR, ...params);

  // TODO(burdon): Option to display/hide stack.
  log.catch = (error: Error, context, meta) => processLog(LogLevel.ERROR, String(error.stack), context, meta, error);

  /**
   * Process the current log call.
   */
  const processLog = (level: LogLevel, message: string, context?: LogContext, meta?: LogMetadata, error?: Error) => {
    log._config.processor(log._config, {
      level,
      message,
      context,
      meta,
      error
    });
  };

  return log;
};

/**
 * Global logging function.
 */
// TODO(burdon): Instance loggers? (e.g., provide additional displayed logging context/filtering).
export const log = ((globalThis as any).dx_log ??= createLog());

declare global {
  // eslint-disable-next-line camelcase
  const dx_log: Log;
}
