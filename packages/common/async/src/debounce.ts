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
export const delay = <CB extends Callback>(cb: CB, delay = 100): CB => {
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
  }) as CB;
};

/**
 * Debounce callback.
 *
 * @param cb Callback to invoke.
 * @param delay Time window to wait before allowing calls.
 * @returns A new function that wraps the callback and ensures that the callback is only invoked after the time window has passed and no new calls have been made.
 */
export const debounce = <CB extends Callback>(cb: CB, delay = 100): CB => {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => cb(...args), delay);
  }) as CB;
};

/**
 * Throttle callback.
 *
 * @param cb Callback to invoke.
 * @param delay Time window to allow calls in.
 * @returns A new function that wraps the callback and prevents multiple invocations within the time window.
 */
export const throttle = <CB extends Callback>(cb: CB, delay = 100): CB => {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      cb(...args);
      lastCall = now;
    }
  }) as CB;
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
export const debounceAndThrottle = <CB extends Callback>(cb: CB, delay = 100): CB => {
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
  }) as CB;
};
