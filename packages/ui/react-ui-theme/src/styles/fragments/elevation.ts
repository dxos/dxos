//
// Copyright 2023 DXOS.org
//

import { type ComponentFragment, type Elevation } from '@dxos/react-ui-types';

/**
 * @deprecated
 */
export const contentElevation: ComponentFragment<{ elevation?: Elevation }> = (_) => ['shadow-none'];

export const surfaceElevation: ComponentFragment<{ elevation?: Elevation }> = ({ elevation }) => [
  elevation === 'group' ? 'shadow' : elevation === 'chrome' ? 'shadow-lg' : 'shadow-none',
];
