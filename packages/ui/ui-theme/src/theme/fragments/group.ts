//
// Copyright 2023 DXOS.org
//

import { type ComponentFragment, type Elevation } from '@dxos/ui-types';

import { surfaceShadow } from './elevation';

export const group: ComponentFragment<{ elevation?: Elevation }> = (props) => [
  props.elevation === 'base' ? 'bg-transparent border border-separator' : 'bg-modalSurface',
  surfaceShadow(props),
];
