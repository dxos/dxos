//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { INPUT_NAME, InputScopedProps, useInputContext } from './Root';

type LabelProps = ComponentPropsWithRef<typeof Primitive.label> & { asChild?: boolean };

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ __inputScope, asChild, children, ...props }: InputScopedProps<LabelProps>, forwardedRef) => {
    const { id } = useInputContext(INPUT_NAME, __inputScope);
    const Root = asChild ? Slot : Primitive.label;
    return (
      <Root {...props} htmlFor={id} ref={forwardedRef}>
        {children}
      </Root>
    );
  }
);

export { Label };

export type { LabelProps };
