//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { forwardRef } from 'react';

import { ButtonProps } from '../../props';
import { buttonClassName } from '../../styles';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={cx(buttonClassName(props), props.className)}
      {...(props.disabled && { disabled: true })}
    >
      {children}
    </button>
  )
);
