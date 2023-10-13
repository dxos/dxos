//
// Copyright 2022 DXOS.org
//

import { type MessageValence } from '@dxos/aurora-types';

export const successText = 'text-xs font-medium text-success-550 dark:text-success-300';
export const infoText = 'text-xs font-medium text-info-550 dark:text-info-300';
export const warningText = 'text-xs font-medium text-warning-550 dark:text-warning-300';
export const errorText = 'text-xs font-medium text-error-550 dark:text-error-300';

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
  'shadow-success-500/50 dark:shadow-success-500/50 text-success-600 dark:text-success-100 bg-success-50 dark:bg-success-900';
export const infoMessageColors =
  'shadow-info-500/50 dark:shadow-info-500/50 text-info-600 dark:text-info-100 bg-info-50 dark:bg-info-900';
export const warningMessageColors =
  'shadow-warning-500/50 dark:shadow-warning-500/50 text-warning-600 dark:text-warning-100 bg-warning-50 dark:bg-warning-900';
export const errorMessageColors =
  'shadow-error-500/50 dark:shadow-error-500/50 text-error-600 dark:text-error-100 bg-error-50 dark:bg-error-900';

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
