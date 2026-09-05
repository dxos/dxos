//
// Copyright 2023 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { INPUT_NAME, useInputContext } from './InputContext';

type TextInputProps = Omit<ComponentPropsWithRef<typeof ark.input>, 'id'>;

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(({ ...props }: TextInputProps, forwardedRef) => {
  const { id, validationValence, descriptionId, errorMessageId } = useInputContext(INPUT_NAME);
  return (
    <ark.input
      {...{
        ...props,
        id,
        'aria-describedby': descriptionId,
        ...(validationValence === 'error' && {
          'aria-invalid': 'true' as const,
          'aria-errormessage': errorMessageId,
        }),
        'ref': forwardedRef,
      }}
    />
  );
});

export { TextInput };

export type { TextInputProps };
