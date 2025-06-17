//
// Copyright 2023 DXOS.org
//

import { ContextDisposeReason, type Context } from './context';
import { ContextDeadlineExceededError } from './context-deadline-exceeded-error';
import { ContextDisposedError } from './context-disposed-error';

/**
 * @returns A promise that rejects when the context is disposed.
 * @deprecated Use `cancelWithContext` instead.
 */
// TODO(dmaretskyi): Memory leak.
export const rejectOnDispose = (ctx: Context, error = new ContextDisposedError()): Promise<never> =>
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
      clearDispose = ctx.onDispose((reason) => {
        switch (reason) {
          case ContextDisposeReason.DEADLINE_EXCEEDED:
            reject(new ContextDeadlineExceededError());
            break;
          case ContextDisposeReason.DISPOSED:
          default:
            reject(new ContextDisposedError());
            break;
        }
      });
    }),
  ]).finally(() => clearDispose?.());
};
