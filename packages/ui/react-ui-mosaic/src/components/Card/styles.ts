//
// Copyright 2025 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

export const styles = {
  root: 'group/card relative flex flex-col w-full min-h-(--dx-rail-item) dx-card-min-width overflow-hidden',
  border:
    'bg-card-surface border border-separator dark:border-subdued-separator rounded-xs dx-focus-ring-group-y-indicator',

  /**
   * Used only for the coarse density CardToolbar variant (larger avatar icon column).
   * Standard density uses the Column subgrid columns directly.
   */
  coarse_icon: 'grid-cols-[var(--dx-l0-avatar-size)_minmax(0,1fr)_var(--dx-rail-item)]',

  poster: 'max-h-[200px]',
} satisfies Record<string, ClassNameValue>;
