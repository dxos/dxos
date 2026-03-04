//
// Copyright 2022 DXOS.org
//

import { type MessageValence } from '@dxos/ui-types';

export const textValence = (valence?: MessageValence) => {
  switch (valence) {
    case 'success':
      return 'font-medium text-success-text';
    case 'info':
      return 'font-medium text-info-text';
    case 'warning':
      return 'font-medium text-warning-text';
    case 'error':
      return 'font-medium text-error-text';
  }
};

export const messageValence = (valence?: MessageValence) => {
  switch (valence) {
    case 'success':
      return 'font-medium text-success-text border-success-text bg-success-surface';
    case 'info':
      return 'font-medium text-info-text border-info-text bg-info-surface';
    case 'warning':
      return 'font-medium text-warning-text border-warning-text bg-warning-surface';
    case 'error':
      return 'font-medium text-error-text border-error-text bg-error-surface';
    default:
      return 'font-medium text-neutral-text border-neutral-text bg-neutral-surface';
  }
};
