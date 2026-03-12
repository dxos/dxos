//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { composableProps, mx } from '@dxos/ui-theme';
import { Slot } from '@radix-ui/react-slot';
import { SlottableProps } from '@dxos/ui-types';
import { Primitive } from '@radix-ui/react-primitive';

export type ContainerProps = SlottableProps<HTMLDivElement>;

export const Container = ({ children, asChild, ...props }: ContainerProps) => {
  const { className, ...rest } = composableProps<HTMLDivElement>(props, { role: 'none' });
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp
      {...rest}
      className={mx('dx-container', className)}
    >
      {children}
    </Comp>
  );
};

const Foo = ({ count, ...props }: { count?: number }) => {
  return (
    <Container {...props} classNames={['flex flex-col']}>
      <div className='border border-red-500'>
        {count}
      </div>
    </Container>
  )
}
