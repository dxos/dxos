//
// Copyright 2023 DXOS.org
//

import { type Density } from '@dxos/ui-types';

export const coarseBlockSize = 'min-bs-[2.5rem]';
export const coarseTextPadding = 'pli-3';
export const coarseButtonPadding = 'pli-4';
export const coarseDimensions = `${coarseBlockSize} ${coarseTextPadding}`;
export const coarseButtonDimensions = `${coarseBlockSize} ${coarseButtonPadding}`;
export const fineBlockSize = 'min-bs-[2.5rem] pointer-fine:min-bs-[2rem]';
export const fineTextPadding = 'pli-2';
export const fineButtonPadding = 'pli-2.5';
export const fineDimensions = `${fineBlockSize} ${fineTextPadding}`;
export const fineButtonDimensions = `${fineBlockSize} ${fineButtonPadding}`;
export const densityBlockSize = (density: Density = 'coarse') => (density === 'fine' ? fineBlockSize : coarseBlockSize);
