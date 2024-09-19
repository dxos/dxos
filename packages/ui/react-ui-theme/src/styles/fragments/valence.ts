//
// Copyright 2022 DXOS.org
//

import { type MessageValence } from '@dxos/react-ui-types';

export const successText = 'text-xs font-medium text-successText';
export const infoText = 'text-xs font-medium text-infoText';
export const warningText = 'text-xs font-medium text-warningText';
export const errorText = 'text-xs font-medium text-errorText';

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

export const neutralMessageColors = 'bg-attention';
export const successMessageColors = 'shadow-successShadow text-successMessageText bg-successMessageSurface';
export const infoMessageColors = 'shadow-infoShadow text-infoMessageText bg-infoMessageSurface';
export const warningMessageColors = 'shadow-warningShadow text-warningMessageText bg-warningMessageSurface';
export const errorMessageColors = 'shadow-errorShadow text-errorMessageText bg-errorMessageSurface';

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
