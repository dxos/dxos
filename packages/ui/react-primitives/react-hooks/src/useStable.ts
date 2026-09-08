//
// Copyright 2026 DXOS.org
//

import { useRef } from 'react';

/**
 * Holds the previous reference for as long as `equals` accepts the incoming value, so a value the
 * caller assembles inline keeps one identity across the caller's renders.
 *
 * The ref is written during render, so a render React discards can leave it holding the discarded
 * value. That costs identity stability on the next render but never correctness: the returned
 * value always satisfies `equals` against `value`.
 */
// `NoInfer` keeps `T` coming from `value`: a comparator declared over `unknown` (`shallowEqual`)
// would otherwise widen it and erase the caller's type.
export const useStable = <T>(value: T, equals: (a: NoInfer<T>, b: NoInfer<T>) => boolean): T => {
  const ref = useRef(value);
  if (!equals(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
};
