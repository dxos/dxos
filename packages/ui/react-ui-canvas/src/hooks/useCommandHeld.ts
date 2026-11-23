//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { hasCommandKey } from '../model/index.ts';

/** Whether the command key is held, so a view can show the hand tool's grab cursor a left drag would get. */
export const useCommandHeld = (): boolean => {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => setHeld(hasCommandKey(event));
    // A window that loses focus never hears the key go up.
    const onBlur = () => setHeld(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  return held;
};
