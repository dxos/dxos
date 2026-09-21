//
// Copyright 2026 DXOS.org
//

import { useRef } from 'react';

/**
 * `value` while present, and the last present value once it is not, so a view that is still exiting
 * renders what it was showing rather than emptying a frame after the state that fed it is gone.
 */
export const useLastPresent = <T>(present: boolean, value: T | null | undefined): T | undefined => {
  const held = useRef<T | undefined>(value ?? undefined);
  if (present && value) {
    held.current = value;
  }
  return (present ? value : held.current) ?? undefined;
};
