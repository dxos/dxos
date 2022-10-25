//
// Copyright 2022 DXOS.org
//

export const testTimeout = <T>(
  promise: Promise<T>,
  timeout = 500
): Promise<T> => {
  const error = new Error('Test timed out');
  let cancelTimeout: any;

  const timeoutPromise = new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(error);
    }, timeout);

    cancelTimeout = () => {
      clearTimeout(timer);
    };
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    cancelTimeout();
  });
};
