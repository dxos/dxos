//
// Copyright 2022 DXOS.org
//

import { ValidationValence } from '../props';

export const successText = 'text-xs font-medium text-success-700 dark:text-success-300';
export const warningText = 'text-xs font-medium text-warning-700 dark:text-warning-300';
export const errorText = 'text-xs font-medium text-error-700 dark:text-error-300';
export const infoText = 'text-xs font-medium text-info-700 dark:text-info-300';

export const valenceColorText = (valence?: ValidationValence) => {
  switch (valence) {
    case ValidationValence.error: return errorText;
    case ValidationValence.warning: return warningText;
    case ValidationValence.info: return infoText;
    case ValidationValence.success: return successText;
    default: return undefined;
  }
};

export const neutralInputBorder = 'border-neutral-500 dark:border-neutral-600';
export const successInputBorder = 'border-success-500 dark:border-success-600';
export const infoInputBorder = 'border-info-500 dark:border-info-600';
export const warningInputBorder = 'border-warning-500 dark:border-warning-600';
export const errorInputBorder = 'border-error-500 dark:border-error-600';

export const valenceInputBorder = (valence?: ValidationValence) => {
  switch (valence) {
    case ValidationValence.error: return errorInputBorder;
    case ValidationValence.warning: return warningInputBorder;
    case ValidationValence.info: return infoInputBorder;
    case ValidationValence.success: return successInputBorder;
    default: return neutralInputBorder;
  }
};
