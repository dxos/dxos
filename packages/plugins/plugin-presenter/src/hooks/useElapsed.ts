//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

const TICK = 250;

/** Seconds since `key` last changed (a slide coming on screen), updated a few times a second. */
export const useElapsed = (key: string | undefined): number => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    setElapsed(0);
    const interval = setInterval(() => setElapsed((performance.now() - start) / 1000), TICK);
    return () => clearInterval(interval);
  }, [key]);
  return elapsed;
};
