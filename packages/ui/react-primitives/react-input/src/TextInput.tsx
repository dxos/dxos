//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { INPUT_NAME, type InputScopedProps, useInputContext } from './Root';

type TextInputProps = Omit<ComponentPropsWithRef<typeof Primitive.input>, 'id'>;

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ __inputScope, ...props }: InputScopedProps<TextInputProps>, forwardedRef) => {
    const { id, validationValence, descriptionId, errorMessageId } = useInputContext(INPUT_NAME, __inputScope);
    return (
      <Primitive.input
        {...{
          ...props,
          id,
          'aria-describedby': descriptionId,
          ...(validationValence === 'error' && {
            'aria-invalid': 'true' as const,
            'aria-errormessage': errorMessageId,
          }),
          ref: forwardedRef,
        }}
      />
    );
  },
);

export { TextInput };

export type { TextInputProps };
