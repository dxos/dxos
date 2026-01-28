//
// Copyright 2025 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

export const styles = {
  root: [
    'group/card relative',
    'min-bs-[--rail-item] overflow-hidden',
    'is-full is-cardMaxWidth is-cardMinWidth',
    'bg-cardSurface border border-separator dark:border-subduedSeparator rounded-sm dx-focus-ring-group-y-indicator',
  ],

  /**
   * Row grid.
   * NOTE: Rows should provide their own line padding (since they may need to encapsulate buttons, etc.)
   */
  grid_3: 'grid grid-cols-[var(--rail-item)_minmax(0,1fr)_var(--rail-item)] gap-x-1',
  grid_2: 'grid grid-cols-[var(--rail-item)_minmax(0,1fr)] gap-x-1',
} satisfies Record<string, ClassNameValue>;

// TODO(burdon): Remove (support as variants in dialog components)
export const dialogStyles = {
  // Dialog.Content
  content: 'p-0 bs-content min-bs-[8rem] max-bs-full md:max-is-[32rem] overflow-hidden',

  // TODO(burdon): Create Dialog.Header
  header: 'flex justify-between pli-cardSpacingInline mbs-cardSpacingBlock',

  // TODO(burdon): Move.
  paddedOverflow: 'flex-1 min-bs-0 overflow-y-auto plb-cardSpacingBlock',
  searchListRoot: 'flex flex-1 flex-col min-bs-0 pli-cardSpacingInline pbs-cardSpacingBlock [&>input]:mbe-0',
} satisfies Record<string, ClassNameValue>;
