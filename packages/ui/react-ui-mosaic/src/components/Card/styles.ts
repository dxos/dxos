//
// Copyright 2025 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

export const styles = {
  root: [
    'group/card relative',
    'min-bs-[--rail-item] overflow-hidden',
    'bg-cardSurface border border-separator dark:border-subduedSeparator rounded-sm dx-focus-ring-group-y-indicator',
  ],
  /**
   * Outer grid.
   */
  grid: '!pli-1 grid grid-cols-[var(--rail-item)_minmax(0,1fr)_var(--rail-item)] gap-1',
  /**
   * Inner grid.
   */
  row: '!pli-1 col-span-3 grid grid-cols-[auto_1fr_auto] items-center',
} satisfies Record<string, ClassNameValue>;

// TODO(burdon): Remove.
export const cardSpacing = 'pli-cardSpacingInline mlb-cardSpacingBlock';
export const cardNoSpacing = 'pli-0 mlb-0';
export const cardChrome =
  'pli-[--dx-cardSpacingChrome] mlb-[--dx-cardSpacingChrome] [&_.dx-button]:text-start [&_.dx-button]:is-full [&_.dx-button]:pis-[calc(var(--dx-cardSpacingInline)-var(--dx-cardSpacingChrome))]';

// TODO(burdon): Move/delete (dialog?)
export const cardDialogContent = 'p-0 bs-content min-bs-[8rem] max-bs-full md:max-is-[32rem] overflow-hidden';
export const cardDialogHeader = 'flex justify-between pli-cardSpacingInline mbs-cardSpacingBlock';
export const cardDialogOverflow = 'flex-1 min-bs-0 overflow-y-auto';
export const cardDialogPaddedOverflow = [cardDialogOverflow, 'plb-cardSpacingBlock'];
export const cardDialogSearchListRoot =
  'flex flex-1 flex-col min-bs-0 pli-cardSpacingInline pbs-cardSpacingBlock [&>input]:mbe-0';
