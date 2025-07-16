//
// Copyright 2023 DXOS.org
//

import { throttle } from './throttle';

/**
 * Debounce callback.
 */
export const debounce = (cb: (...args: any[]) => void, wait = 100): ((...args: any[]) => void) => {
  let t: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => cb(...args), wait);
  };
};

/**
 * Debounce and throttle callback.
 */
export const debounceAndThrottle = (cb: (...args: any[]) => void, wait = 100): ((...args: any[]) => void) => {
  const debounced = debounce(cb, wait);
  const throttled = throttle(cb, wait);

  return (...args: any[]) => {
    debounced(...args);
    throttled(...args);
  };
};
