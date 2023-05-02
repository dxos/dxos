//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { INPUT_NAME, InputScopedProps, useInputContext } from './Root';

type ErrorMessageProps = Omit<ComponentPropsWithRef<typeof Primitive.span>, 'id'> & { asChild?: boolean };

const ErrorMessage = forwardRef<HTMLSpanElement, ErrorMessageProps>(
  ({ __inputScope, asChild, children, ...props }: InputScopedProps<ErrorMessageProps>) => {
    const { errorMessageId } = useInputContext(INPUT_NAME, __inputScope);
    const Root = asChild ? Slot : Primitive.span;
    return (
      <Root {...props} id={errorMessageId}>
        {children}
      </Root>
    );
  }
);

export { ErrorMessage };

export type { ErrorMessageProps };
