//
// Copyright 2025 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

// TODO(burdon): Use theme styles/tokens.
export const styles = {
  root: 'group/card relative flex flex-col w-full min-h-(--dx-rail-item) dx-card-min-width overflow-hidden',
  border:
    'bg-card-surface border border-separator dark:border-subdued-separator rounded-xs dx-focus-ring-group-y-indicator',

  /**
   * Three-column icon-slot row grids.
   * Standard density uses Container.Row directly; these are kept for direct grid usage in Toolbar/Action/Link
   * and for the coarse density variant with a larger avatar column.
   */
  row: 'grid grid-cols-[var(--dx-rail-item)_minmax(0,1fr)_var(--dx-rail-item)] gap-x-1',
  row_coarse: 'grid grid-cols-[var(--dx-l0-avatar-size)_minmax(0,1fr)_var(--dx-rail-item)] gap-x-1',

  poster: 'max-h-[200px]',
} satisfies Record<string, ClassNameValue>;
