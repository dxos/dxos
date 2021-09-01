//
// Copyright 2020 DXOS.org
//

/**
 * Helper to convert a callback based API into a promise based API.
 */
export function createPromiseFromCallback<T = void> (run: (cb: (error?: Error, value?: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    run((error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value!);
      }
    });
  });
}
