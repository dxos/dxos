//
// Copyright 2022 DXOS.org
//

import { MessageValence } from '../props';

export const successText = 'text-xs font-medium text-success-700 dark:text-success-300';
export const infoText = 'text-xs font-medium text-info-700 dark:text-info-300';
export const warningText = 'text-xs font-medium text-warning-700 dark:text-warning-300';
export const errorText = 'text-xs font-medium text-error-700 dark:text-error-300';

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

export const neutralInputBorder = 'border-neutral-500 dark:border-neutral-600';
export const successInputBorder = 'border-success-500 dark:border-success-600';
export const infoInputBorder = 'border-info-500 dark:border-info-600';
export const warningInputBorder = 'border-warning-500 dark:border-warning-600';
export const errorInputBorder = 'border-error-500 dark:border-error-600';

export const valenceInputBorder = (valence?: MessageValence) => {
  switch (valence) {
    case 'success':
      return successInputBorder;
    case 'info':
      return infoInputBorder;
    case 'warning':
      return warningInputBorder;
    case 'error':
      return errorInputBorder;
    default:
      return neutralInputBorder;
  }
};

export const neutralAlertColors = 'border-neutral-500 dark:border-neutral-600';
export const successAlertColors =
  'border-success-500 dark:border-success-600 text-success-700 dark:text-success-100 bg-success-50 dark:bg-success-900';
export const infoAlertColors =
  'border-info-500 dark:border-info-600 text-info-700 dark:text-info-100 bg-info-50 dark:bg-info-900';
export const warningAlertColors =
  'border-warning-500 dark:border-warning-600 text-warning-700 dark:text-warning-100 bg-warning-50 dark:bg-warning-900';
export const errorAlertColors =
  'border-error-500 dark:border-error-600 text-error-700 dark:text-error-100 bg-error-50 dark:bg-error-900';

export const valenceAlertColors = (valence?: MessageValence) => {
  switch (valence) {
    case 'success':
      return successAlertColors;
    case 'info':
      return infoAlertColors;
    case 'warning':
      return warningAlertColors;
    case 'error':
      return errorAlertColors;
    default:
      return neutralAlertColors;
  }
};
