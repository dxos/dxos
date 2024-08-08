//
// Copyright 2023 DXOS.org
//

export const DEFAULT_INDENTATION = 16;

export const levelPadding = (level: number) => {
  switch (level) {
    case 0:
      return 'pis-3';
    case 1:
      return 'pis-3';
    case 2:
      return 'pis-6';
    case 3:
      return 'pis-9';
    case 4:
      return 'pis-12';
    default:
      return 'pis-14';
  }
};

export const navTreeHeading = 'flex-1 is-0 truncate text-start';

export const topLevelSpacing = 'pbs-2.5 pointer-fine:pbs-1.5';

export const topLevelText = 'text-sm font-medium';

export const treeItemText = 'text-sm font-normal';

export const navTreeColumns = (presence?: boolean) =>
  presence
    ? '[navtree-row-start] 1fr min-content min-content min-content [navtree-row-end]'
    : '[navtree-row-start] 1fr min-content min-content [navtree-row-end]';
