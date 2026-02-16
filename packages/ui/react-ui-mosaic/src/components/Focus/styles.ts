//
// Copyright 2026 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

// TODO(burdon): Create theme for component.
export const styles = {
  container: {
    root: [
      // TODO(burdon): Option for border/rounded; ring/outline vs border?
      'outline-none border border-separator md:rounded-md',
      // Focus (e.g., via tabster).
      'focus:!border-accentSurface',
      // Active (e.g., drop target).
      'data-[focus-state=active]:border-neutralFocusIndicator',
      // Error
      'data-[focus-state=error]:border-rose-500',
    ],
  },
} satisfies Record<string, Record<string, ClassNameValue>>;
