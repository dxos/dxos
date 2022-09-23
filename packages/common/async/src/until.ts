//
// Copyright 2022 DXOS.org
//

export type UntilCallback<T> = (resolve: (value: T) => void, reject: (error: Error) => void) => void | Promise<void>

/**
 * Awaits promise.
 */
export const until = <T = void> (cb: UntilCallback<T>, timeout?: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const t = timeout && setTimeout(() => {
      reject(new Error(`Timeout after ${t}ms`));
    }, timeout);

    setImmediate(async () => {
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
