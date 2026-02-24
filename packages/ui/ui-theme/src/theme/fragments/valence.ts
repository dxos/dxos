//
// Copyright 2022 DXOS.org
//

import { type MessageValence } from '@dxos/ui-types';

export const successText = 'text-xs font-medium text-success';
export const infoText = 'text-xs font-medium text-info';
export const warningText = 'text-xs font-medium text-warning';
export const errorText = 'text-xs font-medium text-error';

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

export const neutralMessageColors = 'border border-dashed border-separator text-subdued';
export const successMessageColors = 'text-success-surface-text bg-success-surface';
export const infoMessageColors = 'text-info-surface-text bg-info-surface';
export const warningMessageColors = 'text-warning-surface-text bg-warning-surface';
export const errorMessageColors = 'text-error-surface-text bg-error-surface';

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
