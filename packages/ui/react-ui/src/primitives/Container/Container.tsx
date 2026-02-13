//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type HTMLAttributes, type PropsWithChildren, type Ref, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type SlottableProps } from '@dxos/ui-types';

export type ContainerProps = SlottableProps<PropsWithChildren<HTMLAttributes<HTMLDivElement>>>;

export const Container = forwardRef(
  ({ classNames, className, asChild, role = 'none', children, ...props }: ContainerProps, ref: Ref<HTMLDivElement>) => {
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root {...props} className={mx('flex flex-col', className, classNames)} role={role} ref={ref}>
        {children}
      </Root>
    );
  },
);
