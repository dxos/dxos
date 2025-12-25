//
// Copyright 2024 DXOS.org
//

import { useEffect, useRef, useState } from 'react';

const isFunction = <T>(functionToCheck: any): functionToCheck is (value: T) => boolean => {
  return functionToCheck instanceof Function;
};

/**
 * This is an internal custom hook that checks if a value has transitioned from a specified 'from' value to a 'to' value.
 *
 * @param currentValue - The value that is being monitored for transitions.
 * @param fromValue - The *from* value or a predicate function that determines the start of the transition.
 * @param toValue - The *to* value or a predicate function that determines the end of the transition.
 * @returns A boolean indicating whether the transition from *fromValue* to *toValue* has occurred.
 *
 * @internal Consider using `useOnTransition` for handling transitions instead of this hook.
 */
export const useDidTransition = <T>(
  currentValue: T,
  fromValue: T | ((value: T) => boolean),
  toValue: T | ((value: T) => boolean),
) => {
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const previousValue = useRef<T>(currentValue);

  useEffect(() => {
    const toValueValid = isFunction<T>(toValue) ? toValue(currentValue) : toValue === currentValue;
    const fromValueValid = isFunction<T>(fromValue)
      ? fromValue(previousValue.current)
      : fromValue === previousValue.current;

    if (fromValueValid && toValueValid && !hasTransitioned) {
      setHasTransitioned(true);
    } else if ((!fromValueValid || !toValueValid) && hasTransitioned) {
      setHasTransitioned(false);
    }

    previousValue.current = currentValue;
  }, [currentValue, fromValue, toValue, hasTransitioned]);

  return hasTransitioned;
};

/**
 * Executes a callback function when a specified transition occurs in a value.
 *
 * This function utilizes the `useDidTransition` hook to monitor changes in `currentValue`.
 * When `currentValue` transitions from `fromValue` to `toValue`, the provided `callback` function is executed.
 */
// TODO(wittjosiah): Seems overwrought.
export const useOnTransition = <T>(
  currentValue: T,
  fromValue: T | ((value: T) => boolean),
  toValue: T | ((value: T) => boolean),
  callback: () => void,
) => {
  const dirty = useRef(false);
  const hasTransitioned = useDidTransition(currentValue, fromValue, toValue);

  useEffect(() => {
    dirty.current = false;
  }, [currentValue, dirty]);

  useEffect(() => {
    if (hasTransitioned && !dirty.current) {
      callback();
      dirty.current = true;
    }
  }, [hasTransitioned, dirty, callback]);
};
