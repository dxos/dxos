//
// Copyright 2022 DXOS.org
//

import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { useForwardedRef, useThemeContext } from '../../hooks';
import { defaultInput, subduedInput } from '../../styles';
import { mx } from '../../util';
import { InputProps, InputSize } from './InputProps';

const sizeMap: Record<InputSize, string> = {
  md: 'text-base',
  lg: 'text-lg',
  pin: '',
  textarea: ''
};

export type BareTextInputProps = Omit<ComponentPropsWithRef<'input'>, 'size'> &
  Pick<InputProps, 'validationMessage' | 'validationValence' | 'size' | 'variant'>;

export const BareTextInput = forwardRef<HTMLInputElement, BareTextInputProps>(
  ({ validationValence, validationMessage, variant, size, ...inputSlot }, ref) => {
    const { themeVariant } = useThemeContext();
    const inputRef = useForwardedRef(ref);
    return (
      <input
        {...inputSlot}
        ref={inputRef}
        className={mx(
          (variant === 'subdued' ? subduedInput : defaultInput)(
            {
              disabled: inputSlot.disabled,
              ...(validationMessage && { validationValence })
            },
            themeVariant
          ),
          sizeMap[size ?? 'md'],
          'block w-full',
          themeVariant === 'os' ? 'pli-1.5 plb-1' : 'pli-2.5 plb-2',
          inputSlot?.className
        )}
      />
    );
  }
);
