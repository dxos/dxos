//
// Copyright 2026 DXOS.org
//

import { useRef } from 'react';

/**
 * Holds the previous reference for as long as `equals` accepts the incoming value, so a value the
 * caller assembles inline keeps one identity across the caller's renders.
 *
 * A render React discards can leave the ref holding the discarded value, which costs identity
 * stability on the next render but never correctness.
 */
// `NoInfer` keeps `T` coming from `value`: a comparator declared over `unknown` would widen it.
export const useStable = <T>(value: T, equals: (a: NoInfer<T>, b: NoInfer<T>) => boolean): T => {
  const ref = useRef(value);
  if (!equals(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
};
