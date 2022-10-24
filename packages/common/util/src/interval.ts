//
// Copyright 2022 DXOS.org
//

/**
 * Runs the callback in an exponentially increasing interval.
 * @returns Callback to clear the interval.
 */
export const exponentialBackoffInterval = (cb: () => void, initialInterval: number): () => void => {
  let interval = initialInterval;
  const repeat = () => {
    cb();
    interval *= 2;
    timeoutId = setTimeout(repeat, interval);
  };

  let timeoutId = setTimeout(repeat, interval);
  return () => clearTimeout(timeoutId);
};
