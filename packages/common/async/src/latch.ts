//
// Copyright 2020 DXOS.org
//

import { invariant } from '@dxos/invariant';

type LatchProps = {
  count?: number;
  timeout?: number;
};

type LatchResult = [() => Promise<number>, () => number, (err: Error) => void];

/**
 * Returns a callback and a promise that's resolved when the callback is called n times.
 */
// TODO(burdon): Reconcile with until/trigger.
export const latch = ({ count = 1, timeout }: LatchProps = {}): LatchResult => {
  invariant(count >= 0);

  let t: ReturnType<typeof setTimeout>;
  let doResolve: (value: number) => void;
  let doReject: (err: Error) => void;
  const promise = new Promise<number>((resolve, reject) => {
    doResolve = (value) => {
      clearTimeout(t);
      resolve(value);
    };

    doReject = (err) => {
      clearTimeout(t);
      reject(err);
    };
  });

  if (count === 0) {
    setTimeout(() => {
      doResolve(0);
    });
  } else {
    if (timeout) {
      t = setTimeout(() => {
        doReject(new Error(`Timed out after ${timeout.toLocaleString()}ms`));
      }, timeout);
    }
  }

  let i = 0;
  return [
    async () => await promise,
    () => {
      if (++i === count) {
        doResolve(i);
      }

      return i;
    },
    (err: Error) => doReject(err),
  ];
};
