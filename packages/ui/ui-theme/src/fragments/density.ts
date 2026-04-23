//
// Copyright 2023 DXOS.org
//

import { type Density } from '@dxos/ui-types';

const fineBlockSize = 'min-h-[2.5rem] pointer-fine:min-h-[2rem]';
const coarseBlockSize = 'min-h-[2.5rem]';

const fineDimensions = `${fineBlockSize} px-2`;
const coarseDimensions = `${coarseBlockSize} px-3`;

export const densityDimensions = (density: Density = 'fine') =>
  density === 'fine' ? fineDimensions : coarseDimensions;

export const densityBlockSize = (density: Density = 'fine') => (density === 'fine' ? fineBlockSize : coarseBlockSize);
