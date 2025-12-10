//
// Copyright 2025 DXOS.org
//

import { useKeyboard, useRenderer } from '@opentui/solid';
import { type Setter } from 'solid-js';

export type FocusElement = 'input' | 'messages';

/**
 * Custom hook for chat keyboard bindings.
 */
export const useChatKeyboard = (setFocusedElement: Setter<FocusElement>) => {
  const renderer = useRenderer();

  useKeyboard((key) => {
    // Exit on Escape or Ctrl+C.
    if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
      renderer.destroy();
      restoreTerminal();
      process.exit(0);
    }

    // Tab to switch focus between input and messages.
    if (key.name === 'tab') {
      setFocusedElement((prev) => (prev === 'input' ? 'messages' : 'input'));
    }
  });
};

/**
 * Restore terminal to normal state before exiting.
 */
export const restoreTerminal = () => {
  try {
    // Show cursor.
    process.stdout.write('\x1b[?25h');
    // Reset attributes.
    process.stdout.write('\x1b[0m');
    // Disable mouse tracking.
    process.stdout.write('\x1b[?1000l');
    process.stdout.write('\x1b[?1002l');
    process.stdout.write('\x1b[?1003l');
    process.stdout.write('\x1b[?1006l');
    // Exit alternate screen if used.
    process.stdout.write('\x1b[?1049l');
    if (process.stdin.isTTY && process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }
  } catch {
    // Ignore errors during cleanup.
  }
};
