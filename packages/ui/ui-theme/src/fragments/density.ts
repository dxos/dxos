//
// Copyright 2023 DXOS.org
//

import { type Density } from '@dxos/ui-types';

const lgBlockSize = 'min-h-[2.5rem]';
const mdBlockSize = 'min-h-[2.5rem] pointer-fine:min-h-[2rem]';
const smBlockSize = 'min-h-[1.75rem]';

const lgDimensions = `${lgBlockSize} px-3`;
const mdDimensions = `${mdBlockSize} px-2`;
const smDimensions = `${smBlockSize} px-1.5`;

export const densityDimensions = (density: Density = 'md') => {
  switch (density) {
    case 'lg':
      return lgDimensions;
    case 'sm':
      return smDimensions;
    case 'md':
    default:
      return mdDimensions;
  }
};

export const densityBlockSize = (density: Density = 'md') => {
  switch (density) {
    case 'lg':
      return lgBlockSize;
    case 'sm':
      return smBlockSize;
    case 'md':
    default:
      return mdBlockSize;
  }
};
