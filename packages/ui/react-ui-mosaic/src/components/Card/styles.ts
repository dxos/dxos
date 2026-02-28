//
// Copyright 2025 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

export const styles = {
  root: 'group/card relative min-h-(--dx-rail-item) w-full card-min-width overflow-hidden',
  border:
    'bg-card-surface border border-separator dark:border-subdued-separator rounded-xs dx-focus-ring-group-y-indicator',

  /**
   * Row grid.
   * NOTE: Rows should provide their own line padding (since they may need to encapsulate buttons, etc.)
   */
  grid_3: 'grid grid-cols-[var(--dx-rail-item)_minmax(0,1fr)_var(--dx-rail-item)] gap-x-1',
  grid_2: 'grid grid-cols-[var(--dx-rail-item)_minmax(0,1fr)] gap-x-1',

  // TODO(burdon): Address density.
  grid_3_coarse: 'grid grid-cols-[var(--dx-l0-avatar-size)_minmax(0,1fr)_var(--dx-rail-item)] gap-x-1',

  poster: 'max-h-[200px]',
} satisfies Record<string, ClassNameValue>;
