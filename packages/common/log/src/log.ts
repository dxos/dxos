//
// Copyright 2022 DXOS.org
//

import { LogConfig, LogLevel, LogOptions } from './config';
import { LogContext, LogMetadata } from './context';
import { getConfig } from './options';

/**
 * Logging function.
 */
type LogFunction = (message: string, context?: LogContext, meta?: LogMetadata) => void;

/**
 * Logging methods.
 */
interface LogMethods {
  debug: LogFunction;
  info: LogFunction;
  warn: LogFunction;
  error: LogFunction;
  catch: (error: Error | any, context?: LogContext, meta?: LogMetadata) => void;
  break: () => void;
}

/**
 * Properties accessible on the logging function.
 */
interface Log extends LogMethods, LogFunction {
  config: (options: LogOptions) => void;
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

  // Catch only shows error message, not stacktrace.
  log.catch = (error: Error | any, context, meta) => processLog(LogLevel.ERROR, error.stack, context, meta);

  // Show break.
  log.break = () => log.info('——————————————————————————————————————————————————');

  /**
   * Process the current log call.
   */
  const processLog = (level: LogLevel, message: string, context?: LogContext, meta?: LogMetadata, error?: Error) => {
    log._config.processors.forEach((fn) => fn(log._config, { level, message, context, meta, error }));
  };

  return log;
};

/**
 * Global logging function.
 */
export const log: Log = ((globalThis as any).dx_log ??= createLog());

/**
 * Accessible from browser console.
 */
declare global {
  // eslint-disable-next-line camelcase
  const dx_log: Log;
}
