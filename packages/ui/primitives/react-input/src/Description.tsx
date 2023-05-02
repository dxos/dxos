//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { INPUT_NAME, InputScopedProps, useInputContext } from './Root';

type DescriptionProps = Omit<ComponentPropsWithRef<typeof Primitive.span>, 'id'> & { asChild?: boolean };

const Description = forwardRef<HTMLSpanElement, DescriptionProps>(
  ({ __inputScope, asChild, children, ...props }: InputScopedProps<DescriptionProps>) => {
    const { descriptionId } = useInputContext(INPUT_NAME, __inputScope);
    const Root = asChild ? Slot : Primitive.span;
    return (
      <Root {...props} id={descriptionId}>
        {children}
      </Root>
    );
  }
);

export { Description };

export type { DescriptionProps };
