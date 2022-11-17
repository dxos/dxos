//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { ComponentProps, ReactNode } from 'react';

export interface ButtonGroupProps extends ComponentProps<'div'> {
  children?: ReactNode;
}

export const ButtonGroup = ({ children, ...divProps }: ButtonGroupProps) => {
  return (
    <div
      role='none'
      {...divProps}
      className={cx('button-elevation [&>*]:grouped-buttons rounded-md', divProps.className)}
    >
      {children}
    </div>
  );
};
