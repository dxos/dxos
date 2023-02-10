//
// Copyright 2022 DXOS.org
//

import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { useForwardedRef } from '../../hooks';
import { defaultInput, subduedInput } from '../../styles';
import { mx } from '../../util';
import { TextareaProps } from './InputProps';

export type BareTextareaInputProps = ComponentPropsWithRef<'textarea'> &
  Pick<TextareaProps, 'validationMessage' | 'validationValence' | 'variant'>;

export const BareTextareaInput = forwardRef<HTMLTextAreaElement, BareTextareaInputProps>(
  ({ validationValence, validationMessage, variant, ...inputSlot }, ref) => {
    const textareaRef = useForwardedRef(ref);
    return (
      <textarea
        ref={textareaRef}
        {...inputSlot}
        className={mx(
          (variant === 'subdued' ? subduedInput : defaultInput)({
            disabled: inputSlot.disabled,
            ...(validationMessage && { validationValence })
          }),
          'block w-full px-2.5 py-2',
          inputSlot?.className
        )}
      />
    );
  }
);
