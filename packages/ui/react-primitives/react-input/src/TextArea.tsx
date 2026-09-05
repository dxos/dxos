//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { INPUT_NAME, useInputContext } from './InputContext';

type TextAreaProps = Omit<ComponentPropsWithRef<'textarea'>, 'id'>;

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({ ...props }: TextAreaProps, forwardedRef) => {
  const { id, validationValence, descriptionId, errorMessageId } = useInputContext(INPUT_NAME);
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
        'ref': forwardedRef,
      }}
    />
  );
});

export { TextArea };

export type { TextAreaProps };
