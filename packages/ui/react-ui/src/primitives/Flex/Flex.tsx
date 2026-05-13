//
// Copyright 2026 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React from 'react';

import { composableProps, mx, slottable } from '@dxos/ui-theme';

export type FlexProps = { column?: boolean; grow?: boolean };

export const Flex = slottable<HTMLDivElement, FlexProps>(
  ({ children, asChild, column, grow, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp
        ref={forwardedRef}
        {...rest}
        className={mx('flex', column && 'flex-col', grow && 'flex-1 overflow-hidden', className)}
      >
        {children}
      </Comp>
    );
  },
);
