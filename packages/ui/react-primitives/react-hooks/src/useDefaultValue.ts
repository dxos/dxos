//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

/**
 * A custom React hook that provides a stable default value for a potentially undefined reactive value.
 * The defaultValue is memoized upon component mount and remains unchanged until the component unmounts,
 * ensuring stability across all re-renders, even if the defaultValue prop changes.
 *
 * Note: The defaultValue is not reactive. It retains the same value from the component's mount to unmount.
 *
 * @param reactiveValue - The value that may change over time.
 * @param defaultValue - The initial value used when the reactiveValue is undefined. This value is not reactive.
 * @returns - The reactiveValue if it's defined, otherwise the defaultValue.
 */
export const useDefaultValue = <T>(reactiveValue: T | undefined | null, getDefaultValue: () => T): T => {
  // Memoize defaultValue with an empty dependency array.
  // This ensures that the defaultValue instance remains stable across all re-renders,
  // regardless of whether the defaultValue changes.
  const stableDefaultValue = useMemo(getDefaultValue, []);
  const [value, setValue] = useState(reactiveValue ?? stableDefaultValue);
  useEffect(() => {
    setValue(reactiveValue ?? stableDefaultValue);
  }, [reactiveValue, stableDefaultValue]);

  return value;
};
