//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

/** True while Space is held, outside text fields; a held key's repeats are ignored. */
export const usePushToTalk = (): boolean => {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const isTyping = (event: KeyboardEvent) =>
      event.target instanceof HTMLElement &&
      (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isTyping(event)) {
        // Space would otherwise also click the focused button or scroll the page.
        event.preventDefault();
        if (!event.repeat) {
          setHeld(true);
        }
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isTyping(event)) {
        event.preventDefault();
        setHeld(false);
      }
    };
    const onBlur = () => setHeld(false);
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp, { capture: true });
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  return held;
};
