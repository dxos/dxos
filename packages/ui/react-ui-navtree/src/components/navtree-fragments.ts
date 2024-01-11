//
// Copyright 2023 DXOS.org
//

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

export const topLevelCollapsibleSpacing = 'mbs-2.5 pointer-fine:mbs-1.5';

export const topLevelText = 'text-sm font-medium';

export const treeItemText = 'text-sm font-normal';

// TODO(burdon): Move to theme.
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

export const topLevelHeadingHoverColor = (palette?: string) => {
  switch (palette) {
    case 'red':
      return 'hover:text-red-450 focus-visible:text-red-450 dark:hover:text-red-200 dark:focus-visible:text-red-200';
    case 'orange':
      return 'hover:text-orange-450 focus-visible:text-orange-450 dark:hover:text-orange-200 dark:focus-visible:text-orange-200';
    case 'amber':
      return 'hover:text-amber-450 focus-visible:text-amber-450 dark:hover:text-amber-200 dark:focus-visible:text-amber-200';
    case 'yellow':
      return 'hover:text-yellow-450 focus-visible:text-yellow-450 dark:hover:text-yellow-200 dark:focus-visible:text-yellow-200';
    case 'lime':
      return 'hover:text-lime-450 focus-visible:text-lime-450 dark:hover:text-lime-200 dark:focus-visible:text-lime-200';
    case 'green':
      return 'hover:text-green-450 focus-visible:text-green-450 dark:hover:text-green-200 dark:focus-visible:text-green-200';
    case 'emerald':
      return 'hover:text-emerald-450 focus-visible:text-emerald-450 dark:hover:text-emerald-200 dark:focus-visible:text-emerald-200';
    case 'teal':
      return 'hover:text-teal-450 focus-visible:text-teal-450 dark:hover:text-teal-200 dark:focus-visible:text-teal-200';
    case 'cyan':
      return 'hover:text-cyan-450 focus-visible:text-cyan-450 dark:hover:text-cyan-200 dark:focus-visible:text-cyan-200';
    case 'sky':
      return 'hover:text-sky-450 focus-visible:text-sky-450 dark:hover:text-sky-200 dark:focus-visible:text-sky-200';
    case 'blue':
      return 'hover:text-blue-450 focus-visible:text-blue-450 dark:hover:text-blue-200 dark:focus-visible:text-blue-200';
    case 'indigo':
      return 'hover:text-indigo-450 focus-visible:text-indigo-450 dark:hover:text-indigo-200 dark:focus-visible:text-indigo-200';
    case 'violet':
      return 'hover:text-violet-450 focus-visible:text-violet-450 dark:hover:text-violet-200 dark:focus-visible:text-violet-200';
    case 'fuchsia':
      return 'hover:text-fuchsia-450 focus-visible:text-fuchsia-450 dark:hover:text-fuchsia-200 dark:focus-visible:text-fuchsia-200';
    case 'pink':
      return 'hover:text-pink-450 focus-visible:text-pink-450 dark:hover:text-pink-200 dark:focus-visible:text-pink-200';
    case 'rose':
      return 'hover:text-rose-450 focus-visible:text-rose-450 dark:hover:text-rose-200 dark:focus-visible:text-rose-200';
    default:
      return 'hover:text-primary-450 focus-visible:text-primary-450 dark:hover:text-primary-200 dark:focus-visible:text-primary-200';
  }
};
