//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

/**
 * Returns a copy of `value` that only updates after it has stopped changing for `delayMs`.
 *
 * Unlike `useDeferredValue` (which still commits every intermediate value, just at a lower
 * priority), this coalesces a burst of rapid updates into a single settled value. The mailbox
 * search uses it so the ECHO query's AST changes only when the user pauses typing — otherwise the
 * paginated store rebuilds on every keystroke and the list flashes empty.
 */
export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
};
