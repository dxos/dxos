//
// Copyright 2025 DXOS.org
//

export const cardRoot =
  'rounded overflow-hidden bg-cardSurface border border-separator dark:border-subduedSeparator dx-focus-ring-group-y-indicator relative min-bs-[--rail-item] group/card';

export const cardSpacing = 'pli-cardSpacingInline mlb-cardSpacingBlock';
export const cardNoSpacing = 'pli-0 mlb-0';
export const labelSpacing = 'mbs-inputSpacingBlock mbe-labelSpacingBlock';

export const cardDialogContent = 'p-0 bs-content min-bs-[8rem] max-bs-full md:max-is-[32rem] overflow-hidden';
export const cardDialogHeader = 'pli-cardSpacingInline mbs-cardSpacingBlock flex justify-between';
export const cardDialogOverflow = 'overflow-y-auto min-bs-0 flex-1';
export const cardDialogPaddedOverflow = `${cardDialogOverflow} plb-cardSpacingBlock`;
export const cardDialogSearchListRoot =
  'pli-cardSpacingInline pbs-cardSpacingBlock [&>input]:mbe-0 min-bs-0 flex-1 flex flex-col';

export const cardText = cardSpacing;

export const cardHeading = 'text-lg font-medium line-clamp-2 grow';

export const cardChrome =
  'pli-[--dx-cardSpacingChrome] mlb-[--dx-cardSpacingChrome] [&_.dx-button]:text-start [&_.dx-button]:is-full [&_.dx-button]:pis-[calc(var(--dx-cardSpacingInline)-var(--dx-cardSpacingChrome))]';
