//
// Copyright 2026 DXOS.org
//

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';

/**
 * Interval (ms) between auto-played trace messages in the snapshot playback story.
 */
export const PLAYBACK_INTERVAL_MS = 250;

export const STEP_STORAGE_KEY = 'plugin-assistant.trace-panel.snapshot.step';

/**
 * `useState<number>` that hydrates from and persists to `localStorage`.
 * The third tuple member is `true` iff a valid value was loaded on first render.
 */
export const useLocalStorageNumber = (
  key: string,
  initial: number,
): [number, Dispatch<SetStateAction<number>>, boolean] => {
  const initRef = useRef<{ value: number; hydrated: boolean } | null>(null);
  if (initRef.current === null) {
    let value = initial;
    let hydrated = false;
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(key);
      const parsed = stored === null ? Number.NaN : Number(stored);
      if (Number.isInteger(parsed) && parsed >= 0) {
        value = parsed;
        hydrated = true;
      }
    }
    initRef.current = { value, hydrated };
  }

  const [value, setValue] = useState(initRef.current.value);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, String(value));
    }
  }, [key, value]);

  return [value, setValue, initRef.current.hydrated];
};
