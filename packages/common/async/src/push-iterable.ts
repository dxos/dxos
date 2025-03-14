//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { Trigger } from './trigger';

interface PushAsyncIterable<T, TReturn = any> extends AsyncIterable<T, TReturn> {
  /**
   * Push a value into the iterable.
   */
  next(value: T): void;

  /**
   * Return a value from the iterable.
   */
  return(value?: TReturn): void;

  /**
   * Throw an error from the iterable.
   */
  throw(value?: any): void;
}

/**
 * Creates an async iterable where the data is pushed by calling methods on the iterable.
 */
export const makePushIterable = <T, TReturn = any>(): PushAsyncIterable<T, TReturn> => {
  const buf: ({ kind: 'next'; value: T } | { kind: 'return'; value: TReturn } | { kind: 'throw'; value?: any })[] = [];
  const trigger = new Trigger({ autoReset: true });

  return {
    [Symbol.asyncIterator]() {
      return {
        next: async (): Promise<IteratorResult<T, TReturn>> => {
          while (buf.length === 0) {
            await trigger.wait();
          }

          const item = buf.shift();
          invariant(item);

          switch (item.kind) {
            case 'next':
              return { value: item.value, done: false };
            case 'return':
              return { value: item.value, done: true };
            case 'throw':
              throw item.value;
          }
        },
      };
    },
    next: (value: T) => {
      buf.push({ kind: 'next', value });
      trigger.wake();
    },
    return: (value: TReturn) => {
      buf.push({ kind: 'return', value });
      trigger.wake();
    },
    throw: (value?: any) => {
      buf.push({ kind: 'throw', value });
      trigger.wake();
    },
  };
};
