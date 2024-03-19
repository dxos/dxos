//
// Copyright 2021 DXOS.org
//

import { type Dispatch, type RefObject, type SetStateAction, useEffect, useRef, useState } from 'react';

/**
 * Extension of useState to return an up-to-date reference.
 * E.g., to use in callbacks where the state value is stale.
 * @param initialValue
 *
 * @deprecated This function has been deprecated.
 */
export const useStateRef = <V>(
  initialValue?: V | (() => V),
): [V | undefined, Dispatch<SetStateAction<V | undefined>>, RefObject<V | undefined>] => {
  const [value, setValue] = useState<V | undefined>(initialValue);
  const ref = useRef<V>();
  useEffect(() => {
    ref.current = value;
  }, [initialValue, value]);

  return [value, setValue, ref];
};

/**
 * Extension of useRef that contains computed values based on dependencies.
 * E.g., to use in callbacks where the state value is stale.
 * @param initialValue
 * @param deps
 */
export const useDynamicRef = <V>(initialValue: () => V, deps: any[]): RefObject<V> => {
  const [, setValue] = useState<V>(initialValue);
  const ref = useRef<V>(initialValue());
  useEffect(() => {
    ref.current = initialValue();
    // Must update state to trigger render cycle.
    setValue(ref.current);
  }, deps);

  return ref;
};

/**
 * State setters to force repaint.
 * @param deps
 */
export const useTimestamp = (deps?: any[]): [number, () => void, number?] => {
  const [{ timestamp, previous }, setTimestamp] = useState<{
    timestamp: number;
    previous?: number;
  }>({ timestamp: Date.now() });
  useEffect(() => {
    setTimestamp({ timestamp: Date.now(), previous: timestamp });
  }, deps ?? []);

  return [timestamp, () => setTimestamp({ timestamp: Date.now(), previous: timestamp }), previous];
};
