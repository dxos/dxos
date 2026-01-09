//
// Copyright 2026 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

// TODO(burdon): Theme?
export const styles = {
  container: {
    // TODO(burdon): Use ring instead of border?
    root: [
      'outline-none border border-separator rounded-sm',
      // Focus (e.g., via tabster).
      // TODO(burdon): Why is ! required?
      'focus:!border-accentSurface',
      // Active (e.g., drop target).
      '_data-[focus-state=active]:border-neutralFocusIndicator',
      // Error
      // TODO(burdon): Error token.
      '_data-[focus-state=error]:border-rose-500',
    ],
  },
} satisfies Record<string, Record<string, ClassNameValue>>;
