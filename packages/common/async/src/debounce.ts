//
// Copyright 2023 DXOS.org
//

type Callback = (...args: any[]) => void;

/**
 * Delay callback execution by a specified time.
 * Unlike debounce, subsequent calls during the delay period are ignored.
 *
 * @param cb Callback to invoke.
 * @param delay Time to wait before invoking the callback.
 * @returns A new function that schedules the callback once and ignores subsequent calls until executed.
 */
export const delay = <F extends Callback>(cb: F, delay = 100): F => {
  let pending = false;
  return ((...args: any[]) => {
    if (pending) {
      return;
    }

    pending = true;
    setTimeout(() => {
      try {
        cb(...args);
      } finally {
        pending = false;
      }
    }, delay);
  }) as F;
};

/**
 * Debounce callback: delays execution until calls stop.
 * Each new call resets the timer, so the callback fires only after the delay elapses with no further calls (trailing-edge).
 * Use when you want to react to the end of a burst of events (e.g. user stops typing).
 *
 * @param cb Callback to invoke.
 * @param delay Idle time (ms) to wait after the last call before invoking.
 * @returns Wrapped function that postpones invocation until activity ceases.
 */
export const debounce = <F extends Callback>(cb: F, delay = 100): F => {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => cb(...args), delay);
  }) as F;
};

/**
 * Throttle callback: limits execution to at most once per interval.
 * The callback fires immediately on the first call;
 * subsequent calls within the same interval are dropped (leading-edge).
 * Use when you need regular updates at a bounded rate (e.g. scroll or resize handlers).
 *
 * @param cb Callback to invoke.
 * @param delay Minimum interval (ms) between successive invocations.
 * @returns Wrapped function that rate-limits invocations.
 */
export const throttle = <F extends Callback>(cb: F, delay = 100): F => {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      cb(...args);
      lastCall = now;
    }
  }) as F;
};

/**
 * Debounce and throttle callback.
 * Executes immediately on the first call (throttle), prevents calls during the throttle window,
 * and ensures a final call happens after activity stops (debounce).
 *
 * @param cb Callback to invoke.
 * @param delay Time window for both throttle and debounce.
 * @returns A new function that combines throttle and debounce behavior.
 */
export const debounceAndThrottle = <F extends Callback>(cb: F, delay = 100): F => {
  let timeout: ReturnType<typeof setTimeout>;
  let lastCall = 0;

  return ((...args: any[]) => {
    const now = Date.now();
    const delta = now - lastCall;

    // Clear any pending debounced call.
    clearTimeout(timeout);

    // Throttle: execute immediately if enough time has passed.
    if (delta >= delay) {
      cb(...args);
      lastCall = now;
    } else {
      // Debounce: schedule to execute after the remaining time.
      timeout = setTimeout(() => {
        cb(...args);
        lastCall = Date.now();
      }, delay - delta);
    }
  }) as F;
};
