//
// Copyright 2023 DXOS.org
//

import { ComponentFragment, Elevation } from '@dxos/aurora-types';

export const minorSurfaceElevation = 'shadow';

export const contentElevation: ComponentFragment<{ elevation?: Elevation }> = ({ elevation }) => [
  elevation === 'group' ? 'shadow' : elevation === 'chrome' ? 'shadow-none' : 'shadow-md',
];

export const surfaceElevation: ComponentFragment<{ elevation?: Elevation }> = ({ elevation }) => [
  elevation === 'group' ? 'shadow-md' : elevation === 'chrome' ? 'shadow-xl' : 'shadow-none',
];
