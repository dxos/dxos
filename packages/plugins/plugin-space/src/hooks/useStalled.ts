//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { log } from '@dxos/log';

export const STALLED_TIMEOUT = 5_000;

export type UseStalledOptions = {
  /** Whether work is outstanding; the timer only runs while true. */
  active: boolean;
  /** Any change re-arms the timer, so slow-but-advancing work is never reported as stalled. */
  progress: number;
  timeout?: number;
};

/**
 * Reports true once active work has made no progress for `timeout`.
 */
export const useStalled = ({ active, progress, timeout = STALLED_TIMEOUT }: UseStalledOptions): boolean => {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    setStalled(false);
    if (!active) {
      return;
    }

    const timer = setTimeout(() => {
      log.warn('stalled', { progress, timeout });
      setStalled(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [active, progress, timeout]);

  return stalled;
};
