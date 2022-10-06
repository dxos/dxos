//
// Copyright 2022 DXOS.org
//

// Copied from @dxos/async.
export function trigger (timeout?: number): [() => Promise<void>, () => void]
export function trigger <T>(timeout?: number): [() => Promise<T>, (arg: T) => void]
export function trigger <T> (timeout?: number): [() => Promise<T>, (arg: T) => void] { // eslint-disable-line @stayradiated/prefer-arrow-functions/prefer-arrow-functions
  let callback: (arg: T) => void;

  const promise = new Promise<T>((resolve, reject) => {
    if (timeout) {
      setTimeout(() => reject(new Error(`Timed out after ${timeout}ms`)), timeout);
    }
    callback = resolve;
  });

  const provider = () => promise;

  const resolver = (value: T) => callback(value);

  return [provider, resolver];
}
