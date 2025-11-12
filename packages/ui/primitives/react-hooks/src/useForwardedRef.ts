//
// Copyright 2022 DXOS.org
//

import { type ForwardedRef, type Ref, type RefCallback, useEffect, useMemo, useRef } from 'react';

/**
 * Combines a possibly undefined forwarded ref with a locally defined ref.
 * Returns a stable ref object that synchronizes with the forwarded ref.
 *
 * Best practice: This hook creates a stable local ref and synchronizes it with the forwarded ref.
 * The returned ref object is stable across renders, preventing infinite loops caused by ref identity changes.
 *
 * NOTE: This pattern doesn't update refs once they are set. If this is required, use `useMergeRefs`.
 */
export const useForwardedRef = <T>(forwardedRef: ForwardedRef<T>) => {
  const localRef = useRef<T>(null as T);
  useEffect(() => {
    setRef(forwardedRef, localRef.current);
  }, [forwardedRef]);

  return localRef;
};

/**
 * Sets a value on a React ref, handling both callback refs and ref objects.
 * Returns a cleanup function if the ref is a callback ref.
 */
export function setRef<T>(ref: Ref<T> | undefined | null, value: T | null): ReturnType<RefCallback<T>> {
  if (typeof ref === 'function') {
    return ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

/**
 * Merges multiple refs into a single ref callback.
 * Returns a ref callback that synchronizes all provided refs and handles cleanup.
 */
export const mergeRefs = <T>(refs: (Ref<T> | undefined)[]): Ref<T> => {
  return (value: T | null) => {
    const cleanups: (() => void)[] = [];
    for (const ref of refs) {
      const cleanup = setRef(ref, value);
      cleanups.push(typeof cleanup === 'function' ? cleanup : () => setRef(ref, null));
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  };
};

/**
 * Hook that merges multiple refs into a single stable ref callback.
 * The returned ref is memoized and only changes when the refs array changes.
 */
export const useMergeRefs = <T>(refs: (Ref<T> | undefined)[]): Ref<T> => {
  return useMemo(() => mergeRefs(refs), refs);
};
