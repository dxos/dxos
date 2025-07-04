//
// Copyright 2025 DXOS.org
//

export const cardRoot = 'contain-layout pli-2 plb-1 first-of-type:pbs-0 last-of-type:pbe-0';

export const cardContent =
  'rounded overflow-hidden bg-cardSurface border border-separator dark:border-subduedSeparator dx-focus-ring-group-y-indicator relative min-bs-[--rail-item] group/card';

export const cardSpacing = 'pli-cardSpacingInline mlb-cardSpacingBlock';
export const labelSpacing = 'mbs-inputSpacingBlock mbe-labelSpacingBlock';

export const cardDialogContent = 'p-0 bs-content min-bs-[8rem] max-bs-full md:max-is-[32rem] overflow-hidden';
export const cardDialogHeader = 'pli-cardSpacingInline mbs-cardSpacingBlock flex justify-between';
export const cardDialogOverflow = 'overflow-y-auto min-bs-0 flex-1';
export const cardDialogPaddedOverflow = `${cardDialogOverflow} plb-cardSpacingBlock`;
export const cardDialogSearchListRoot =
  'pli-cardSpacingInline pbs-cardSpacingBlock [&>input]:mbe-0 min-bs-0 flex-1 flex flex-col';

export const cardText = cardSpacing;

export const cardHeading = 'text-lg font-medium line-clamp-2';

export const cardChrome =
  'pli-[--dx-cardSpacingChrome] mlb-[--dx-cardSpacingChrome] [&_.dx-button]:text-start [&_.dx-button]:is-full';
