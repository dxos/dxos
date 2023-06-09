//
// Copyright 2023 DXOS.org
//

import { CancelledError } from '@dxos/errors';

import { Context } from './context';

/**
 * @returns A promise that rejects when the context is disposed.
 */
// TODO(dmaretskyi): Memory leak.
export const rejectOnDispose = (ctx: Context, error = new CancelledError()): Promise<never> =>
  new Promise((resolve, reject) => {
    ctx.onDispose(() => reject(error));
  });

/**
 * Rejects the promise if the context is disposed.
 */
export const cancelWithContext = <T>(ctx: Context, promise: Promise<T>): Promise<T> => {
  let clearDispose: () => void;
  return Promise.race([
    promise,
    new Promise<never>((resolve, reject) => {
      // Will be called before .finally() handlers.
      clearDispose = ctx.onDispose(() => reject(new CancelledError()));
    })
  ]).finally(() => clearDispose?.());
};
