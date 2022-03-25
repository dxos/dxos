//
// Copyright 2022 DXOS.org
//

import { useEffect, useRef } from 'react';

// TODO(burdon): Factor hook utils (incl. gem useStateWithRef).

/**
 * Maintains an up-to-date reference to a changing value.
 * @param value
 */
export const useUpdatedRef = <T> (value: T) => {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
};
