//
// Copyright 2023 DXOS.org
//

import { ComponentFragment, Elevation } from '@dxos/aurora-types';

export const contentElevation: ComponentFragment<{ elevation?: Elevation }> = ({ elevation }) => [
  elevation === 'group' ? 'shadow-sm' : elevation === 'chrome' ? 'shadow-none' : 'shadow',
];

export const surfaceElevation: ComponentFragment<{ elevation?: Elevation }> = ({ elevation }) => [
  elevation === 'group' ? 'shadow' : elevation === 'chrome' ? 'shadow-xl' : 'shadow-none',
];
