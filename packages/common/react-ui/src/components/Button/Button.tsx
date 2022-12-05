//
// Copyright 2022 DXOS.org
//

import React, { forwardRef } from 'react';

import { mx } from '../../util';
import { ButtonProps } from './ButtonProps';
import { buttonStyles } from './buttonStyles';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ children, compact, variant, ...rootSlot }, ref) => (
  <button
    ref={ref}
    {...rootSlot}
    className={mx(buttonStyles({ compact, variant, disabled: rootSlot.disabled }), rootSlot.className)}
    {...(rootSlot.disabled && { disabled: true })}
  >
    {children}
  </button>
));
