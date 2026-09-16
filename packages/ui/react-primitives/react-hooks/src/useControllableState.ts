//
// Copyright 2026 DXOS.org
//

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

export type UseControllableStateParams<T> = {
  prop?: T | undefined;
  defaultProp?: T | undefined;
  onChange?: (state: T) => void;
};

const isUpdater = <T>(value: SetStateAction<T>): value is (prev: T) => T => typeof value === 'function';

/**
 * State that is controlled when `prop` is supplied and uncontrolled (seeded from `defaultProp`) otherwise.
 * `onChange` fires for every change in either mode; in controlled mode the setter only reports, it never stores.
 */
export const useControllableState = <T>({
  prop,
  defaultProp,
  onChange,
}: UseControllableStateParams<T>): readonly [T | undefined, Dispatch<SetStateAction<T | undefined>>] => {
  const [uncontrolledProp, setUncontrolledProp] = useState(defaultProp);
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolledProp;

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Uncontrolled changes are reported after commit so an updater resolves through React's own
  // batching rather than a stale snapshot.
  const prevValueRef = useRef(uncontrolledProp);
  useEffect(() => {
    if (prevValueRef.current !== uncontrolledProp) {
      // An updater may resolve to `undefined` (clearing), which a consumer's `onChange` is declared
      // not to take; the cast preserves that contract without widening every consumer's signature.
      onChangeRef.current?.(uncontrolledProp as T);
      prevValueRef.current = uncontrolledProp;
    }
  }, [uncontrolledProp]);

  const setValue = useCallback<Dispatch<SetStateAction<T | undefined>>>(
    (nextValue) => {
      if (isControlled) {
        const next = isUpdater(nextValue) ? nextValue(prop) : nextValue;
        if (next !== prop) {
          // See the cast above.
          onChangeRef.current?.(next as T);
        }
      } else {
        setUncontrolledProp(nextValue);
      }
    },
    [isControlled, prop],
  );

  return [value, setValue] as const;
};
