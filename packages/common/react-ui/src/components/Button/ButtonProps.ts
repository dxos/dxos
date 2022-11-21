//
// Copyright 2022 DXOS.org
//

import { ComponentProps } from 'react';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'default' | 'primary' | 'outline' | 'ghost';
  compact?: boolean;
  rounding?: string;
  spacing?: string;
  disabled?: boolean;
}
