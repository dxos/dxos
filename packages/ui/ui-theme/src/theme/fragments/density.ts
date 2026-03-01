//
// Copyright 2023 DXOS.org
//

import { type Density } from '@dxos/ui-types';

export const coarseBlockSize = 'min-h-[2.5rem]';
export const coarseDimensions = `${coarseBlockSize} px-3`;

export const fineBlockSize = 'min-h-[2.5rem] pointer-fine:min-h-[2rem]';
export const fineDimensions = `${fineBlockSize} px-2`;

export const densityBlockSize = (density: Density = 'coarse') => (density === 'fine' ? fineBlockSize : coarseBlockSize);
