//
// Copyright 2025 DXOS.org
//

import { useRef } from 'react';

// TODO(burdon): react-ui.

/**
 * A custom hook that ensures a callback reference remains stable while allowing the callback
 * implementation to be updated. This is useful for callbacks that need to access the latest
 * state/props values while maintaining a stable reference to prevent unnecessary re-renders.
 *
 * @template F - The function type of the callback.
 * @param callback - The callback function to memoize.
 * @returns A stable callback reference that will always call the latest implementation.
 */
export const useDynamicCallback = <F extends (...args: any[]) => any>(callback: F): F => {
  const ref = useRef<F>(callback);
  ref.current = callback;
  return ((...args) => ref.current(...args)) as F;
};
