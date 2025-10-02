//
// Copyright 2025 DXOS.org
//

import { useCallback, useRef, useState } from 'react';

import { type Space } from '@dxos/client/echo';

export const useFlush = (space?: Space) => {
  const [state, setState] = useState<'idle' | 'flushing' | 'flushed'>('idle');
  const resetTimer = useRef<NodeJS.Timeout | null>(null);

  const handleFlush = useCallback(() => {
    if (!space) {
      return;
    }

    queueMicrotask(async () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }

      setState('flushing');
      await space.db.flush();
      setState('flushed');

      resetTimer.current = setTimeout(() => {
        setState('idle');
        resetTimer.current = null;
      }, 1_000);
    });
  }, [space]);

  return { state, handleFlush };
};
