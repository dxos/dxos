//
// Copyright 2022 DXOS.org
//

import { ComponentProps } from 'react';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'default' | 'primary' | 'outline';
  compact?: boolean;
  rounding?: string;
  disabled?: boolean;
}
