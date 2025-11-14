//
// Copyright 2022 DXOS.org
//

import { type LogConfig, LogLevel, type LogOptions } from './config';
import { type LogContext, type LogProcessor } from './context';
import { createFunctionLogDecorator, createMethodLogDecorator } from './decorators';
import { type CallMetadata } from './meta';
import { DEFAULT_PROCESSORS, createConfig } from './options';

/**
 * Logging function.
 */
type LogFunction = (message: string, context?: LogContext, meta?: CallMetadata) => void;

/**
 * Logging methods.
 */
export interface LogMethods {
  trace: LogFunction;
  debug: LogFunction;
  verbose: LogFunction;
  info: LogFunction;
  warn: LogFunction;
  error: LogFunction;
  catch: (error: Error | any, context?: LogContext, meta?: CallMetadata) => void;

  break: () => void;
  stack: (message?: string, context?: never, meta?: CallMetadata) => void;

  method: (arg0?: never, arg1?: never, meta?: CallMetadata) => MethodDecorator;
  func: <F extends (...args: any[]) => any>(
    name: string,
    fn: F,
    opts?: { transformOutput?: (result: ReturnType<F>) => Promise<any> | any },
  ) => F;
}

/**
 * Properties accessible on the logging function.
 * @internal
 */
export interface Log extends LogMethods, LogFunction {
  readonly runtimeConfig: LogConfig;
  config: (options: LogOptions) => Log;
  addProcessor: (processor: LogProcessor) => Log;
}

interface LogImp extends Log {
  _config: LogConfig;
}

/**
 * @internal
 */
export const createLog = (): LogImp => {
  const log: LogImp = ((...params) => processLog(LogLevel.DEBUG, ...params)) as LogImp;
  log._config = createConfig();
  Object.defineProperty(log, 'runtimeConfig', {
    get: () => log._config,
  });

  log.config = (options) => {
    log._config = createConfig(options);
    return log;
  };

  log.addProcessor = (processor) => {
    if (DEFAULT_PROCESSORS.filter((p) => p === processor).length === 0) {
      DEFAULT_PROCESSORS.push(processor);
    }
    if (log._config.processors.filter((p) => p === processor).length === 0) {
      log._config.processors.push(processor);
    }
    return log;
  };

  /**
   * Process the current log call.
   */
  const processLog = (
    level: LogLevel,
    message: string | undefined,
    context: LogContext = {},
    meta?: CallMetadata,
    error?: Error,
  ) => {
    // TODO(burdon): Do filter match upstream here.
    log._config.processors.forEach((processor) =>
      processor(log._config, {
        level,
        message,
        context,
        meta,
        error,
      }),
    );
  };

  /**
   * API.
   */
  Object.assign<Log, LogMethods>(log, {
    trace: (...params) => processLog(LogLevel.TRACE, ...params),
    debug: (...params) => processLog(LogLevel.DEBUG, ...params),
    verbose: (...params) => processLog(LogLevel.VERBOSE, ...params),
    info: (...params) => processLog(LogLevel.INFO, ...params),
    warn: (...params) => processLog(LogLevel.WARN, ...params),
    error: (...params) => processLog(LogLevel.ERROR, ...params),
    catch: (error: Error | any, context, meta) => processLog(LogLevel.ERROR, undefined, context, meta, error),

    break: () => log.info('——————————————————————————————————————————————————'),
    stack: (message, context, meta) =>
      processLog(LogLevel.INFO, `${message ?? 'Stack Dump'}\n${getFormattedStackTrace()}`, context, meta),

    method: createMethodLogDecorator(log),
    func: createFunctionLogDecorator(log),
  });

  return log;
};

/**
 * Global logging function.
 */
export const log: Log = ((globalThis as any).dx_log ??= createLog());

const start = Date.now();
let last = start;

/**
 * Log debug stack.
 */
export const debug = (label?: any, args?: any) => {
  const now = Date.now();
  const err = new Error();
  console.group(
    `DEBUG[${label}]`,
    JSON.stringify({ t: Number(now - start).toLocaleString(), dt: Number(now - last).toLocaleString(), ...args }),
  );
  console.warn(err.stack);
  console.groupEnd();
  last = Date.now();
};

/**
 * Accessible from browser console.
 */
declare global {
  const dx_log: Log;
}

const getFormattedStackTrace = () => new Error().stack!.split('\n').slice(3).join('\n');
