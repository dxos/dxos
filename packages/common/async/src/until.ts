//
// Copyright 2022 DXOS.org
//

export type UntilCallback<T> = (resolve: (value: T) => void, reject: (error: Error) => void) => Promise<T> | void

/**
 * Awaits promise.
 */
// TODO(burdon): Reconcile with latch/trigger.
export const until = <T = void> (cb: UntilCallback<T>, timeout?: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const t = timeout && setTimeout(() => {
      reject(new Error(`Timeout after ${t}ms`));
    }, timeout);

    setTimeout(async () => {
      try {
        await cb((value: T) => {
          t && clearTimeout(t);
          resolve(value);
        }, (error: Error) => {
          t && clearTimeout(t);
          reject(error);
        });
      } catch (err) {
        reject(err);
      }
    });
  });
};

// TODO(burdon): Reconcile promises.
export const untilPromise = <T = void> (cb: () => Promise<T>) => cb();

export const untilError = <T = void> (cb: () => Promise<T>) => {
  return new Promise(async (resolve) => {
    try {
      await cb();
    } catch (err) {
      resolve(err);
    }
  });
};
