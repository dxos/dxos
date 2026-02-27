//
// Copyright 2022 DXOS.org
//

import { type MessageValence } from '@dxos/ui-types';

export const valenceColorText = (valence?: MessageValence) => {
  switch (valence) {
    case 'success':
      return 'text-xs font-medium text-success-text';
    case 'info':
      return 'text-xs font-medium text-info-text';
    case 'warning':
      return 'text-xs font-medium text-warning-text';
    case 'error':
      return 'text-xs font-medium text-error-text';
    default:
      return undefined;
  }
};

export const messageValence = (valence?: MessageValence) => {
  switch (valence) {
    case 'success':
      return 'text-xs font-medium text-success-text border-success-text bg-success-surface';
    case 'info':
      return 'text-xs font-medium text-info-text border-info-text bg-info-surface';
    case 'warning':
      return 'text-xs font-medium text-warning-text border-warning-text bg-warning-surface';
    case 'error':
      return 'text-xs font-medium text-error-text border-error-text bg-error-surface';
    default:
      return 'text-xs font-medium text-neutral-text border-neutral-text bg-neutral-surface';
  }
};
