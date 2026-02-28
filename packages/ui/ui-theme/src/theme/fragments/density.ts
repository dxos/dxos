//
// Copyright 2023 DXOS.org
//

import { type Density } from '@dxos/ui-types';

export const coarseBlockSize = 'min-h-[2.5rem]';
export const coarseTextPadding = 'px-3';
export const coarseButtonPadding = 'px-4';
export const coarseDimensions = `${coarseBlockSize} ${coarseTextPadding}`;
export const coarseButtonDimensions = `${coarseBlockSize} ${coarseButtonPadding}`;

export const fineBlockSize = 'min-h-[2.5rem] pointer-fine:min-h-[2rem]';
export const fineTextPadding = 'px-2';
export const fineButtonPadding = 'px-2.5';
export const fineDimensions = `${fineBlockSize} ${fineTextPadding}`;
export const fineButtonDimensions = `${fineBlockSize} ${fineButtonPadding}`;

export const densityBlockSize = (density: Density = 'coarse') => (density === 'fine' ? fineBlockSize : coarseBlockSize);
