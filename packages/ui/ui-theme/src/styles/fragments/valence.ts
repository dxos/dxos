//
// Copyright 2022 DXOS.org
//

import { type MessageValence } from '@dxos/ui-types';

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

export const neutralMessageColors = 'border border-dashed border-separator text-subdued';
export const successMessageColors = 'text-successSurfaceText bg-successSurface';
export const infoMessageColors = 'text-infoSurfaceText bg-infoSurface';
export const warningMessageColors = 'text-warningSurfaceText bg-warningSurface';
export const errorMessageColors = 'text-errorSurfaceText bg-errorSurface';

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
