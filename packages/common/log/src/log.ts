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

  catch: (error: Error | any, context?: LogContext, meta?: LogMetadata) => void;
}

interface LogImp extends Log {
  _config: LogConfig;
}

const createLog = (): LogImp => {
  const log: LogImp = (...params) => processLog(LogLevel.DEBUG, ...params);

  log._config = getConfig();

  // Set config.
  log.config = (options: LogOptions) => {
    log._config = getConfig(options);
  };

  // TODO(burdon): API to set context and separate error object.
  //  E.g., log.warn('failed', { key: 123 }, err);

  log.debug = (...params) => processLog(LogLevel.DEBUG, ...params);
  log.info = (...params) => processLog(LogLevel.INFO, ...params);
  log.warn = (...params) => processLog(LogLevel.WARN, ...params);
  log.error = (...params) => processLog(LogLevel.ERROR, ...params);

  // TODO(burdon): Not required since can determine value.
  log.catch = (error: Error | any, context, meta) => processLog(LogLevel.ERROR, error.message, context, meta, error);

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
export const log: Log = ((globalThis as any).dx_log ??= createLog());

declare global {
  // eslint-disable-next-line camelcase
  const dx_log: Log;
}
