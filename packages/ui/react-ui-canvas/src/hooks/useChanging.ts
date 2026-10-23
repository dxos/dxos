//
// Copyright 2026 DXOS.org
//

import { useEffect, useRef, useState } from 'react';

/** Whether `value` changed within the last `settle` ms: true from its first change until it holds still that long. */
export const useChanging = <T>(value: T, settle: number): boolean => {
  const [changing, setChanging] = useState(false);
  const previous = useRef(value);
  useEffect(() => {
    if (Object.is(previous.current, value)) {
      return;
    }
    previous.current = value;
    setChanging(true);
    const timer = setTimeout(() => setChanging(false), settle);
    return () => clearTimeout(timer);
  }, [value, settle]);
  return changing;
};
