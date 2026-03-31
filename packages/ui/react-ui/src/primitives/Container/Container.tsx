//
// Copyright 2026 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React from 'react';

import { composableProps, mx, slottable } from '@dxos/ui-theme';

export const Container = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps<HTMLDivElement>(props, { role: 'none' });
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp {...rest} className={mx('dx-container', className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});
