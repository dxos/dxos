//
// Copyright 2020 DXOS.org
//

export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Helper to convert a callback based API into a promise based API.
 */
export const promiseFromCallback = <T = void>(run: (cb: (error?: Error, value?: T) => void) => void): Promise<T> =>
  new Promise((resolve, reject) => {
    run((error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value!);
      }
    });
  });
