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
      return 'font-medium border-success-text text-success-fg bg-success-surface';
    case 'info':
      return 'font-medium border-info-text text-info-fg bg-info-surface';
    case 'warning':
      return 'font-medium border-warning-text text-warning-fg bg-warning-surface';
    case 'error':
      return 'font-medium border-error-text text-error-fg bg-error-surface';
    default:
      return 'font-medium border-neutral-text text-neutral-fg bg-neutral-surface';
  }
};

/**
 * Classes for a Button rendered inside a Message.Root that should inherit the message's valence color.
 * Message.Root sets --dx-valence-bg / --dx-valence-bg-hover / --dx-valence-text on its DOM node.
 * Pass variant='valence' to the Button so button.css reads those variables.
 */
export const buttonValence = (_valence?: MessageValence): string =>
  'text-(--dx-valence-text) bg-(--dx-valence-bg) hover:bg-(--dx-valence-bg-hover)';
