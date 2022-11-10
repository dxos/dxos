//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { ComponentProps } from 'react';

import { defaultInput } from '../../styles/input';
import { InputProps, InputSize } from './InputProps';

const sizeMap: Record<InputSize, string> = {
  md: 'text-sm',
  lg: 'text-base',
  pin: ''
};

export type BareTextInputProps = Omit<InputProps, 'label' | 'initialValue' | 'onChange'> &
  Pick<ComponentProps<'input'>, 'onChange'>;

export const BareTextInput = ({ validationValence, validationMessage, size, ...inputProps }: BareTextInputProps) => {
  return (
    <input
      {...inputProps}
      className={cx(
        defaultInput({ disabled: inputProps.disabled, ...(validationMessage && { validationValence }) }),
        'block w-full px-2.5 py-2',
        sizeMap[size ?? 'md']
      )}
    />
  );
};
