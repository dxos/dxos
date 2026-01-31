//
// Copyright 2025 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

export const styles = {
  root: 'group/card relative min-bs-[--rail-item] overflow-hidden is-full card-min-width __card-max-width',
  border:
    'bg-cardSurface border border-separator dark:border-subduedSeparator rounded-sm dx-focus-ring-group-y-indicator',

  /**
   * Row grid.
   * NOTE: Rows should provide their own line padding (since they may need to encapsulate buttons, etc.)
   */
  grid_3: 'grid grid-cols-[var(--rail-item)_minmax(0,1fr)_var(--rail-item)] gap-x-1',
  grid_2: 'grid grid-cols-[var(--rail-item)_minmax(0,1fr)] gap-x-1',

  poster: 'max-bs-[200px]',
} satisfies Record<string, ClassNameValue>;
