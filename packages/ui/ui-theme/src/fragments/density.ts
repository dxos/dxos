//
// Copyright 2023 DXOS.org
//

import { type Density } from '@dxos/ui-types';

const lgBlockSize = 'min-h-[2.5rem]';
const mdBlockSize = 'min-h-[2.5rem] pointer-fine:min-h-[2rem]';
const smBlockSize = 'min-h-[1.75rem]';
const xsBlockSize = 'min-h-[1.5rem]';

const lgDimensions = `${lgBlockSize} px-3`;
const mdDimensions = `${mdBlockSize} px-2`;
const smDimensions = `${smBlockSize} px-1.5`;
const xsDimensions = `${xsBlockSize} px-1`;

export const densityDimensions = (density: Density = 'md') => {
  switch (density) {
    case 'lg':
      return lgDimensions;
    case 'sm':
      return smDimensions;
    case 'xs':
      return xsDimensions;
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
    case 'xs':
      return xsBlockSize;
    case 'md':
    default:
      return mdBlockSize;
  }
};
