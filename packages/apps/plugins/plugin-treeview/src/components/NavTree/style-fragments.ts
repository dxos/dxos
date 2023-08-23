//
// Copyright 2023 DXOS.org
//

export const levelPadding = (level: number) => {
  switch (level) {
    case 0:
      return 'pis-1';
    case 1:
      return 'pis-2';
    case 2:
      return 'pis-3';
    case 3:
      return 'pis-4';
    case 4:
      return 'pis-5';
    default:
      return 'pis-6';
  }
};

export const navTreeHeading = 'flex-1 min-is-0 truncate text-start';

export const collapsibleSpacing = 'pbs-2.5 pointer-fine:pbs-1.5';
export const topLevelCollapsibleSpacing = 'pbs-2.5 pointer-fine:pbs-1.5';

export const topLevelText = 'text-sm font-system-medium';

export const treeItemText = 'text-sm font-normal';

export const topLevelHeadingColor = (palette?: string) => {
  switch (palette) {
    case 'red':
      return 'text-red-550 dark:text-red-300';
    case 'orange':
      return 'text-orange-550 dark:text-orange-300';
    case 'amber':
      return 'text-amber-550 dark:text-amber-300';
    case 'yellow':
      return 'text-yellow-550 dark:text-yellow-300';
    case 'lime':
      return 'text-lime-550 dark:text-lime-300';
    case 'green':
      return 'text-green-550 dark:text-green-300';
    case 'emerald':
      return 'text-emerald-550 dark:text-emerald-300';
    case 'teal':
      return 'text-teal-550 dark:text-teal-300';
    case 'cyan':
      return 'text-cyan-550 dark:text-cyan-300';
    case 'sky':
      return 'text-sky-550 dark:text-sky-300';
    case 'blue':
      return 'text-blue-550 dark:text-blue-300';
    case 'indigo':
      return 'text-indigo-550 dark:text-indigo-300';
    case 'violet':
      return 'text-violet-550 dark:text-violet-300';
    case 'fuchsia':
      return 'text-fuchsia-550 dark:text-fuchsia-300';
    case 'pink':
      return 'text-pink-550 dark:text-pink-300';
    case 'rose':
      return 'text-rose-550 dark:text-rose-300';
    default:
      return 'text-primary-550 dark:text-primary-300';
  }
};
