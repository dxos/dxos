//
// Copyright 2024 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithoutRef } from 'react';

import { useStackItem } from '../StackContext';

export type StackItemDragHandleProps = ComponentPropsWithoutRef<'button'> & { asChild?: boolean };

export const StackItemDragHandle = ({ asChild, children }: StackItemDragHandleProps) => {
  const { selfDragHandleRef } = useStackItem();

  const Root = asChild ? Slot : 'div';

  return (
    <Root ref={selfDragHandleRef} role='button'>
      {children}
    </Root>
  );
};
