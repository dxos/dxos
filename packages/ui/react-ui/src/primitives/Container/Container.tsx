//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';

import { composableProps, mx } from '@dxos/ui-theme';
import { Slot } from '@radix-ui/react-slot';
import { SlottableProps } from '@dxos/ui-types';
import { Primitive } from '@radix-ui/react-primitive';

export type ContainerProps = SlottableProps<HTMLDivElement>;

export const Container = forwardRef<HTMLDivElement, ContainerProps>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps<HTMLDivElement>(props, { role: 'none' });
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp {...rest} className={mx('dx-container', className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});
