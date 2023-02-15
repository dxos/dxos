//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps, ReactNode } from 'react';

import { mx } from '../../util';
import { useButtonShadow } from '../../hooks/';
import { ElevationProvider } from '../ElevationProvider';

export interface ButtonGroupProps extends ComponentProps<'div'> {
  children?: ReactNode;
}

export const ButtonGroup = ({ children, ...divProps }: ButtonGroupProps) => {
  const shadow = useButtonShadow();
  return (
    <div role='none' {...divProps} className={mx(shadow, 'rounded-md', divProps.className)}>
      <ElevationProvider elevation='chrome'>{children}</ElevationProvider>
    </div>
  );
};
