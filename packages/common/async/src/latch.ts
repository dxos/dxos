//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

/**
 * Returns a callback and a promise that's resolved when the callback is called n times.
 * @param n The number of times the callback is required to be called to resolve the promise.
 */
export const latch = (n = 1) => {
  assert(n > 0);

  let callback: (value: number) => void;
  const promise = new Promise<number>((resolve) => {
    callback = value => resolve(value);
  });

  let count = 0;
  return [
    promise,
    () => {
      if (++count === n) {
        callback(count);
      }
    }
  ] as const;
};
