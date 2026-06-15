//
// Copyright 2024 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithoutRef } from 'react';

import { useStackItem } from '../StackContext';

export type StackItemDragHandleProps = ComponentPropsWithoutRef<'button'> & { asChild?: boolean };

export const StackItemDragHandle = ({ asChild, children }: StackItemDragHandleProps) => {
  const { selfDragHandleRef } = useStackItem();

  const Comp = asChild ? Slot : Primitive.div;

  return (
    <Comp ref={selfDragHandleRef} role='button'>
      {children}
    </Comp>
  );
};
