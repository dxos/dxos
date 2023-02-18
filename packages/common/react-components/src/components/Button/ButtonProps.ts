//
// Copyright 2022 DXOS.org
//

import { ComponentPropsWithRef } from 'react';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'default' | 'primary' | 'outline' | 'ghost';
  compact?: boolean; // TODO(burdon): Global size variant.
  disabled?: boolean;
}
