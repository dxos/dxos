//
// Copyright 2022 DXOS.org
//

import { type ForwardedRef, type Ref, type RefCallback, useEffect, useMemo, useRef } from 'react';

/**
 * Combines a possibly undefined forwarded ref with a locally defined ref.
 * Returns a stable ref object that synchronizes with the forwarded ref.
 *
 * Best practice: This hook creates a stable local ref and synchronizes it with
 * the forwarded ref. The returned ref object is stable across renders, preventing
 * infinite loops caused by ref identity changes.
 */
export const useForwardedRef = <T>(forwardedRef: ForwardedRef<T>) => {
  const localRef = useRef<T>(null as T);
  useEffect(() => {
    setRef(forwardedRef, localRef.current);
  }, [forwardedRef]);

  return localRef;
};

export const setRef = <T>(ref: Ref<T>, value: T | null): void => {
  if (!ref) {
    return;
  }

  if (typeof ref === 'function') {
    ref(value ?? null);
  } else {
    ref.current = value ?? null;
  }
};

export function assignRef<T>(ref: Ref<T> | undefined | null, value: T | null): ReturnType<RefCallback<T>> {
  if (typeof ref === 'function') {
    return ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

/**
 * Merges multiple refs into a single one and memoizes the result to avoid refs execution on each render.
 * @param refs List of refs to merge.
 * @returns Merged ref.
 */
export function useMergeRefs<T>(refs: (Ref<T> | undefined)[]): Ref<T> {
  return useMemo(() => mergeRefs(refs), refs);
}

export function mergeRefs<T>(refs: (Ref<T> | undefined)[]): Ref<T> {
  return (value: T | null) => {
    const cleanups: (() => void)[] = [];
    for (const ref of refs) {
      const cleanup = assignRef(ref, value);
      const isCleanup = typeof cleanup === 'function';
      cleanups.push(isCleanup ? cleanup : () => assignRef(ref, null));
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  };
}
