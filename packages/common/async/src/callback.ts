//
// Copyright 2020 DXOS.org
//

/**
 * Helper to convert a callback based API into a promise based API.
 */
export const createPromiseFromCallback = <T = void>(
  run: (cb: (error?: Error, value?: T) => void) => void
): Promise<T> =>
  new Promise((resolve, reject) => {
    run((error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value!);
      }
    });
  });
