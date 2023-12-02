//
// Copyright 2023 DXOS.org
//

import { inspect } from 'node:util';

import type { LogMethods } from './log';
import { type CallMetadata } from './meta';

let nextPromiseId = 0;

export const createMethodLogDecorator =
  (log: LogMethods) =>
  (arg0?: never, arg1?: never, meta?: CallMetadata): MethodDecorator =>
  (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const method = descriptor.value!;
    descriptor.value = function (this: any, ...args: any) {
      const combinedMeta = {
        ...(meta ?? {}),
        S: this as any,
      } as CallMetadata;

      const formattedArgs = args.map((arg: any) => inspect(arg, false, 1, true)).join(', ');

      try {
        const startTime = performance.now();
        const result = method.apply(this, args);

        if (isThenable(result)) {
          const id = nextPromiseId++;
          log.info(`${propertyKey as string}(${formattedArgs}) => Promise { #${id} }`, {}, combinedMeta);
          result.then(
            (resolvedValue) => {
              if (resolvedValue !== undefined) {
                log.info(
                  `✅ resolve #${id} ${(performance.now() - startTime).toFixed(0)}ms => ${inspect(
                    resolvedValue,
                    false,
                    1,
                    true,
                  )}`,
                  {},
                  combinedMeta,
                );
              } else {
                log.info(`✅ resolve #${id} ${(performance.now() - startTime).toFixed(0)}ms`, {}, combinedMeta);
              }
            },
            (err) => {
              log.info(`🔥 reject #${id} #${(performance.now() - startTime).toFixed(0)}ms => ${err}`, {}, combinedMeta);
            },
          );
        } else {
          log.info(
            `${propertyKey as string}(${formattedArgs}) => ${inspect(result, false, 1, true)}`,
            {},
            combinedMeta,
          );
        }

        return result;
      } catch (err) {
        log.error(`${propertyKey as string}(${formattedArgs}) 🔥 ${err}`, {}, combinedMeta);
        throw err;
      }
    };
    Object.defineProperty(descriptor.value, 'name', { value: (propertyKey as string) + '$log' });
  };

const isThenable = (obj: any): obj is Promise<unknown> => obj && typeof obj.then === 'function';
