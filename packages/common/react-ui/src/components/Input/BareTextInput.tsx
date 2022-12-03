//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps } from 'react';

import { defaultInput } from '../../styles/input';
import { mx } from '../../util';
import { InputProps, InputSize } from './InputProps';

const sizeMap: Record<InputSize, string> = {
  md: 'text-base',
  lg: 'text-lg',
  pin: '',
  textarea: ''
};

export type BareTextInputProps = Omit<InputProps, 'label' | 'initialValue' | 'onChange'> &
  Pick<ComponentProps<'input'>, 'onChange'>;

export const BareTextInput = ({
  validationValence,
  validationMessage,
  size,
  borders,
  typography,
  rounding,
  ...inputProps
}: BareTextInputProps) => {
  return (
    <input
      {...inputProps}
      className={mx(
        defaultInput({
          borders,
          rounding,
          typography: typography ?? sizeMap[size ?? 'md'],
          disabled: inputProps.disabled,
          ...(validationMessage && { validationValence })
        }),
        'block w-full px-2.5 py-2'
      )}
    />
  );
};
