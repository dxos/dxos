//
// Copyright 2025 DXOS.org
//

import { useKeyboard } from '@opentui/solid';
import { type Setter } from 'solid-js';

type FocusElement = 'input' | 'messages';

/**
 * Custom hook for chat keyboard bindings.
 */
export const useChatKeyboard = (setFocusedElement: Setter<FocusElement>) => {
  useKeyboard((key) => {
    // Exit on Escape or Ctrl+C.
    if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
      process.exit(0);
    }

    // Tab to switch focus between input and messages.
    if (key.name === 'tab') {
      setFocusedElement((prev) => (prev === 'input' ? 'messages' : 'input'));
    }
  });
};
