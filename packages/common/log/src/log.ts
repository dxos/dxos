//
// Copyright 2022 DXOS.org
//

import { type LogConfig, LogLevel, type LogOptions } from './config';
import { type LogContext, type LogProcessor } from './context';
import { createFunctionLogDecorator, createMethodLogDecorator } from './decorators';
import { type CallMetadata } from './meta';
import { createConfig } from './options';

/**
 * Accessible from browser console.
 */
declare global {
  const DX_LOG: Log;
}

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

  method: (arg0?: never, arg1?: never, meta?: CallMetadata) => MethodDecorator;
  function: <F extends (...args: any[]) => any>(
    name: string,
    fn: F,
    opts?: {
      transformOutput?: (result: ReturnType<F>) => Promise<any> | any;
    },
  ) => F;

  break: () => void;
  stack: (message?: string, context?: never, meta?: CallMetadata) => void;

  config: (options: LogOptions) => Log;
  addProcessor: (processor: LogProcessor, addDefault?: boolean) => () => void;
}

/**
 * Properties accessible on the logging function.
 * @internal
 */
export interface Log extends LogMethods, LogFunction {
  readonly runtimeConfig: LogConfig;
}

/**
 * @internal
 */
interface LogImp extends Log {
  _id: string;
  _config: LogConfig;
}

let logCount = 0;

/**
 * Create a logging function with properties.
 * @internal
 */
export const createLog = (): LogImp => {
  // Default function.
  const log: LogImp = ((...params) => processLog(LogLevel.DEBUG, ...params)) as LogImp;

  // Add private properties.
  Object.assign<LogImp, Partial<LogImp>>(log, {
    _id: `log-${++logCount}`,
    _config: createConfig(),
  });

  // TODO(burdon): Document.
  Object.defineProperty(log, 'runtimeConfig', {
    get: () => log._config,
  });

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
    console.log('###', log._id, log._config.processors);
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
    catch: (error, context, meta) => processLog(LogLevel.ERROR, undefined, context, meta, error),

    method: createMethodLogDecorator(log),
    function: createFunctionLogDecorator(log),

    break: () => log.info('-'.repeat(80)),
    stack: (message, context, meta) => {
      return processLog(LogLevel.INFO, `${message ?? 'Stack Dump'}\n${getFormattedStackTrace()}`, context, meta);
    },

    config: (options) => {
      log._config = createConfig(options);
      return log;
    },

    addProcessor: (processor) => {
      // TODO(burdon): What is this used for?
      // if (addDefault && DEFAULT_PROCESSORS.filter((p) => p === processor).length === 0) {
      //   DEFAULT_PROCESSORS.push(processor);
      // }
      if (log._config.processors.filter((p) => p === processor).length === 0) {
        log._config.processors.push(processor);
      }

      console.log('add', log._id, log._config.processors);
      return () => {
        console.log('remove', log._id, log._config.processors.length);
        log._config.processors = log._config.processors.filter((p) => p !== processor);
      };
    },
  });

  return log;
};

/**
 * Global logging function.
 */
export const log: Log = ((globalThis as any).DX_LOG ??= createLog());

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

const getFormattedStackTrace = () => new Error().stack!.split('\n').slice(3).join('\n');
