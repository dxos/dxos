//
// Copyright 2026 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

export const styles = {
  container: {
    border: [
      'outline-none border border-separator rounded-sm',
      // Focus
      'focus:border-accentSurface',
      // Active (e.g., drop target)
      'data-[focus-state=active]:border-neutralFocusIndicator',
      // Error
      // TODO(burdon): Error token.
      'data-[focus-state=error]:border-rose-500',
    ],
  },
} satisfies Record<string, Record<string, ClassNameValue>>;
