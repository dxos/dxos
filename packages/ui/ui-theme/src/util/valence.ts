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
    default:
      return 'font-medium';
  }
};

export const messageValence = (valence?: MessageValence) => {
  switch (valence) {
    case 'success':
      return 'font-medium border-success-text text-success-text bg-success-surface';
    case 'info':
      return 'font-medium border-info-text text-info-text bg-info-surface';
    case 'warning':
      return 'font-medium border-warning-text text-warning-text bg-warning-surface';
    case 'error':
      return 'font-medium border-error-text text-error-text bg-error-surface';
    default:
      return 'font-medium border-neutral-text text-neutral-text bg-neutral-surface';
  }
};
