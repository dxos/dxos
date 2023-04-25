//
// Copyright 2022 DXOS.org
//

import { ComponentPropsWithRef } from 'react';

import { Density, Elevation } from '@dxos/aurora-types';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'default' | 'primary' | 'outline' | 'ghost';
  density?: Density;
  elevation?: Elevation;
  disabled?: boolean;
}
