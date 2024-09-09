//
// Copyright 2024 DXOS.org
//

import { useEffect, useRef } from 'react';

export const useStateRef = <T>(value: T) => {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
};
