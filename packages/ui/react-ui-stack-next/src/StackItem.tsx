//
// Copyright 2024 DXOS.org
//

import React, { type ComponentPropsWithoutRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type StackProps } from './Stack';

export const StackItem = ({
  children,
  classNames,
  orientation,
  ...props
}: Omit<ThemedClassName<ComponentPropsWithoutRef<'div'>>, 'aria-orientation'> & {
  orientation?: StackProps['orientation'];
}) => {
  return (
    <div
      className={mx(orientation === 'horizontal' ? 'grid-cols-subgrid' : 'grid-rows-subgrid', classNames)}
      {...props}
    >
      {children}
    </div>
  );
};
