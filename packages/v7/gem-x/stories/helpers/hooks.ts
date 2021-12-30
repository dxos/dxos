//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

/**
 * Extension of useState to return an up-to-date reference to remedy stale closures.
 * @param initialValue
 */
// TODO(burdon): Better way?
// TODO(burdon): Factor out (@dxos/???)
export const useStateRef = <V extends any>(initialValue?: V):
  [V, React.Dispatch<React.SetStateAction<V>>, React.RefObject<V>] => {
  const ref = useRef<V>(initialValue);
  const [value, setValue] = useState<V>(initialValue);
  useEffect(() => {
    ref.current = value;
  }, [initialValue, value]);

  return [value, setValue, ref];
}
