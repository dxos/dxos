//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';

/**
 * Provides a triggered timestamp that can be used to force re-rendering based on deps.
 *
 * ```tsx
 * const [ts, update] = useTimestamp();
 * const handleRefresh = () => update();
 * ```
 *
 * @param deps
 */
export const useTimestamp = (deps?: any[]): [number, () => void, number | undefined] => {
  const [{ timestamp, previous }, setTimestamp] = useState<{ timestamp: number, previous?: number }>({
    timestamp: Date.now()
  });

  useEffect(() => {
    setTimestamp({ timestamp: Date.now(), previous: timestamp });
  }, deps || []);

  return [timestamp, () => setTimestamp({ timestamp: Date.now(), previous: timestamp }), previous];
};
