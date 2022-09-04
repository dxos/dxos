//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

type LatchProps = {
  count?: number
  timeout?: number
}

/**
 * Returns a callback and a promise that's resolved when the callback is called n times.
 * @deprecated Use `until`.
 */
export const latch = ({ count = 1, timeout }: LatchProps = {}) => {
  assert(count > 0);

  let t: ReturnType<typeof setTimeout>;
  let doResolve: (value: number) => void;
  let doReject: (err: Error) => void;
  const promise = new Promise<number>((resolve, reject) => {
    doResolve = value => {
      clearTimeout(t);
      resolve(value);
    };

    doReject = err => {
      clearTimeout(t);
      reject(err);
    };
  });

  if (timeout) {
    t = setTimeout(() => {
      doReject(new Error(`Timed out after ${timeout}ms`));
    }, timeout);
  }

  let i = 0;
  return [
    promise,
    () => {
      if (++i === count) {
        doResolve(i);
      }
    },
    (err: Error) => doReject(err)
  ] as const;
};
