//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { forwardRef } from 'react';

import { ButtonProps } from './ButtonProps';
import { buttonStyles } from './buttonStyles';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, compact, spacing, variant, rounding, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={cx(buttonStyles({ compact, spacing, variant, rounding, disabled: props.disabled }), props.className)}
      {...(props.disabled && { disabled: true })}
    >
      {children}
    </button>
  )
);
