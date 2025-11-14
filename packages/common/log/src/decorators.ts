//
// Copyright 2023 DXOS.org
//

import { inspect } from 'node:util';

import chalk from 'chalk';

import type { LogMethods } from './log';
import { type CallMetadata } from './meta';

let nextPromiseId = 0;

export const createMethodLogDecorator =
  (log: LogMethods) =>
  (arg0?: never, arg1?: never, meta?: CallMetadata): MethodDecorator =>
  (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const method = descriptor.value!;
    const methodName = propertyKey as string;
    descriptor.value = function (this: any, ...args: any) {
      const combinedMeta = {
        F: '',
        L: 0,
        ...(meta ?? {}),
        S: this as any,
      } as CallMetadata;

      const formattedArgs = args.map((arg: any) => inspect(arg, false, 1, true)).join(', ');

      try {
        const startTime = performance.now();
        const result = method.apply(this, args);

        if (isThenable(result)) {
          const id = nextPromiseId++;
          logAsyncBegin(log, methodName, formattedArgs, id, combinedMeta);
          result.then(
            (resolvedValue) => {
              logAsyncResolved(log, methodName, resolvedValue, id, startTime, combinedMeta);
            },
            (err) => {
              logAsyncRejected(log, methodName, err, id, startTime, combinedMeta);
            },
          );
        } else {
          logSyncCall(log, methodName, formattedArgs, result, combinedMeta);
        }

        return result;
      } catch (err: any) {
        logSyncError(log, methodName, formattedArgs, err, combinedMeta);
        throw err;
      }
    };
    Object.defineProperty(descriptor.value, 'name', { value: methodName + '$log' });
  };

export const createFunctionLogDecorator =
  (log: LogMethods) =>
  <F extends (...args: any[]) => any>(
    name: string,
    fn: F,
    opts: { transformOutput?: (result: ReturnType<F>) => Promise<any> | any } = {},
  ): F => {
    const decoratedFn = function (this: any, ...args: any) {
      const combinedMeta = {
        F: '',
        L: 0,
      } as CallMetadata;

      const formattedArgs = args.map((arg: any) => inspect(arg, false, 1, true)).join(', ');

      try {
        const startTime = performance.now();
        const result = fn.apply(this, args);

        let transformedResult = result;
        if (opts.transformOutput) {
          if (isThenable(result)) {
            transformedResult = result.then(opts.transformOutput as any);
          } else {
            transformedResult = opts.transformOutput(result);
          }
        }

        if (isThenable(transformedResult)) {
          const id = nextPromiseId++;
          logAsyncBegin(log, name, formattedArgs, id, combinedMeta);
          transformedResult.then(
            (resolvedValue) => {
              logAsyncResolved(log, name, resolvedValue, id, startTime, combinedMeta);
            },
            (err) => {
              logAsyncRejected(log, name, err, id, startTime, combinedMeta);
            },
          );
        } else {
          logSyncCall(log, name, formattedArgs, transformedResult, combinedMeta);
        }

        return result;
      } catch (err: any) {
        logSyncError(log, name, formattedArgs, err, combinedMeta);
        throw err;
      }
    };
    Object.defineProperty(decoratedFn, 'name', { value: name + '$log' });
    return decoratedFn as F;
  };

const isThenable = (obj: any): obj is Promise<unknown> => obj && typeof obj.then === 'function';

const logSyncCall = (
  log: LogMethods,
  methodName: string,
  formattedArgs: string,
  result: unknown,
  combinedMeta: CallMetadata,
) => {
  log.info(
    `.${formatFunction(methodName)} (${formattedArgs}) ${chalk.gray('=>')} ${inspect(result, false, 1, true)}`,
    {},
    combinedMeta,
  );
};

const logSyncError = (
  log: LogMethods,
  methodName: string,
  formattedArgs: string,
  err: Error,
  combinedMeta: CallMetadata,
) => {
  log.error(`.${formatFunction(methodName)} (${formattedArgs}) 🔥 ${err}`, {}, combinedMeta);
};

const logAsyncBegin = (
  log: LogMethods,
  methodName: string,
  formattedArgs: string,
  promiseId: number,
  combinedMeta: CallMetadata,
) => {
  log.info(
    `.${formatFunction(methodName)} ↴ (${formattedArgs}) ${chalk.gray('=>')} ${formatPromise(promiseId)}`,
    {},
    combinedMeta,
  );
};

const logAsyncResolved = (
  log: LogMethods,
  methodName: string,
  resolvedValue: unknown | undefined,
  promiseId: number,
  startTime: number,
  combinedMeta: CallMetadata,
) => {
  if (resolvedValue !== undefined) {
    log.info(
      `.${formatFunction(methodName)} ↲ ${greenCheck} ${chalk.gray('resolve')} ${formatPromise(promiseId)} ${formatTimeElapsed(startTime)} ${chalk.gray('=>')} ${inspect(
        resolvedValue,
        false,
        1,
        true,
      )}`,
      {},
      combinedMeta,
    );
  } else {
    log.info(
      `.${formatFunction(methodName)} ↲ ${greenCheck} ${chalk.gray('resolve')} ${formatPromise(promiseId)} ${formatTimeElapsed(startTime)}`,
      {},
      combinedMeta,
    );
  }
};

const logAsyncRejected = (
  log: LogMethods,
  methodName: string,
  err: Error,
  promiseId: number,
  startTime: number,
  combinedMeta: CallMetadata,
) => {
  log.info(
    `.${formatFunction(methodName)} ↲ 🔥 ${chalk.gray('reject')} ${formatPromise(promiseId)} ${formatTimeElapsed(startTime)} ${chalk.gray('=>')} ${err}`,
    {},
    combinedMeta,
  );
};

const COLOR_FUNCTION = [220, 220, 170] as const;

// https://github.com/dxos/dxos/issues/7286
const greenCheck = typeof chalk.green === 'function' ? chalk.green('✔') : '✔';

const formatTimeElapsed = (startTime: number) => chalk.gray(`${(performance.now() - startTime).toFixed(0)}ms`);

const formatFunction = (name: string) => chalk.bold(chalk.rgb(...COLOR_FUNCTION)(name));

const formatPromise = (id: number) => chalk.blue(`Promise#${id}`);
