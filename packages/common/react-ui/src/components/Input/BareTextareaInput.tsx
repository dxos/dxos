//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { ComponentProps } from 'react';

import { defaultInput } from '../../styles/input';
import { TextareaProps } from './InputProps';

export type BareTextareaInputProps = Omit<TextareaProps, 'label' | 'initialValue' | 'onChange'> &
  Pick<ComponentProps<'textarea'>, 'onChange'>;

export const BareTextareaInput = ({
  validationValence,
  validationMessage,
  size,
  ...inputProps
}: BareTextareaInputProps) => {
  return (
    <textarea
      {...inputProps}
      className={cx(
        defaultInput({ disabled: inputProps.disabled, ...(validationMessage && { validationValence }) }),
        'block w-full px-2.5 py-2'
      )}
    />
  );
};
