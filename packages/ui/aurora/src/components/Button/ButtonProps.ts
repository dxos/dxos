//
// Copyright 2022 DXOS.org
//

import { ComponentPropsWithRef } from 'react';

import { Density, Elevation } from '@dxos/aurora-theme';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'default' | 'primary' | 'outline' | 'ghost';
  density?: Density;
  elevation?: Elevation;
  disabled?: boolean;
}
