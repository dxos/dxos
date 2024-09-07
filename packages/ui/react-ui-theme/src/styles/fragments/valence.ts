//
// Copyright 2022 DXOS.org
//

import { type MessageValence } from '@dxos/react-ui-types';

export const successText = 'text-xs font-medium text-emerald-550 dark:text-emerald-300';
export const infoText = 'text-xs font-medium text-cyan-550 dark:text-cyan-300';
export const warningText = 'text-xs font-medium text-amber-550 dark:text-amber-300';
export const errorText = 'text-xs font-medium text-rose-550 dark:text-rose-300';

export const valenceColorText = (valence?: MessageValence) => {
  switch (valence) {
    case 'success':
      return successText;
    case 'info':
      return infoText;
    case 'warning':
      return warningText;
    case 'error':
      return errorText;
    default:
      return undefined;
  }
};

export const neutralMessageColors = 'bg-neutral-25 dark:bg-neutral-850';
export const successMessageColors =
  'shadow-emerald-500/50 dark:shadow-emerald-500/50 text-emerald-600 dark:text-emerald-100 bg-emerald-50 dark:bg-emerald-900';
export const infoMessageColors =
  'shadow-cyan-500/50 dark:shadow-cyan-500/50 text-cyan-600 dark:text-cyan-100 bg-cyan-50 dark:bg-cyan-900';
export const warningMessageColors =
  'shadow-amber-500/50 dark:shadow-amber-500/50 text-amber-600 dark:text-amber-100 bg-amber-50 dark:bg-amber-900';
export const errorMessageColors =
  'shadow-rose-500/50 dark:shadow-rose-500/50 text-rose-600 dark:text-rose-100 bg-rose-50 dark:bg-rose-900';

export const messageValence = (valence?: MessageValence) => {
  switch (valence) {
    case 'success':
      return successMessageColors;
    case 'info':
      return infoMessageColors;
    case 'warning':
      return warningMessageColors;
    case 'error':
      return errorMessageColors;
    default:
      return neutralMessageColors;
  }
};
