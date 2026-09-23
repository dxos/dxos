//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { PlatformError } from './errors.ts';

/**
 * Copy text to the system clipboard.
 *
 * Requires a secure context; browsers additionally reject the call unless it happens while handling
 * a user gesture, which a command dispatched from a terminal prompt does satisfy.
 */
export const copyToClipboard = (text: string): Effect.Effect<void, PlatformError> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(text),
    catch: (error) => new PlatformError({ message: 'Failed to copy to clipboard.', cause: error }),
  });

/**
 * Open a URL in a new tab.
 */
export const openBrowser = (url: string): Effect.Effect<void, PlatformError> =>
  Effect.try({
    try: () => {
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        throw new Error('Popup blocked.');
      }
    },
    catch: (error) => new PlatformError({ message: 'Failed to open browser.', cause: error }),
  });
