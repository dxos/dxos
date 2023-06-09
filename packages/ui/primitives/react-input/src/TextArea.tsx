//
// Copyright 2023 DXOS.org
//

import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { INPUT_NAME, InputScopedProps, useInputContext } from './Root';

type TextAreaProps = Omit<ComponentPropsWithRef<'textarea'>, 'id'>;

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ __inputScope, ...props }: InputScopedProps<TextAreaProps>, forwardedRef) => {
    const { id, validationValence, descriptionId, errorMessageId } = useInputContext(INPUT_NAME, __inputScope);
    return (
      <textarea
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

export { TextArea };

export type { TextAreaProps };
