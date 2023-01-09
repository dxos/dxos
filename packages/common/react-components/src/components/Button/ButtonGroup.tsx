//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps, ReactNode } from 'react';

import { mx } from '../../util';

export interface ButtonGroupProps extends ComponentProps<'div'> {
  children?: ReactNode;
}

export const ButtonGroup = ({ children, ...divProps }: ButtonGroupProps) => {
  return (
    <div
      role='none'
      {...divProps}
      className={mx('button-elevation [&>*]:grouped-buttons rounded-md', divProps.className)}
    >
      {children}
    </div>
  );
};
