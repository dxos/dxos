//
// Copyright 2022 DXOS.org
//

import { type MessageValence } from '@dxos/react-ui-types';

export const successText = 'text-xs font-medium text-emeraldText';
export const infoText = 'text-xs font-medium text-cyanText';
export const warningText = 'text-xs font-medium text-amberText';
export const errorText = 'text-xs font-medium text-roseText';

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
export const successMessageColors = 'text-emeraldSurfaceText bg-emeraldSurface';
export const infoMessageColors = 'text-cyanSurfaceText bg-cyanSurface';
export const warningMessageColors = 'text-amberSurfaceText bg-amberSurface';
export const errorMessageColors = 'text-roseSurfaceText bg-roseSurface';

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
