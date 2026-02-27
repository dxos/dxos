//
// Copyright 2023 DXOS.org
//

import React, { type ChangeEventHandler, type ReactNode } from 'react';

import { Input as NaturalInput, type TextInputProps } from '@dxos/react-ui';

export type InputProps = TextInputProps & {
  validationMessage?: string;
  label?: ReactNode;
  disabled?: boolean;
  placeholder?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
};

export const Input = ({ validationMessage, label, ...props }: InputProps) => {
  return (
    <NaturalInput.Root>
      <NaturalInput.Label>{label}</NaturalInput.Label>
      <NaturalInput.TextInput {...props} classNames='py-2 mt-2 text-center' />
      <NaturalInput.DescriptionAndValidation>
        {validationMessage && <NaturalInput.Validation>{validationMessage}</NaturalInput.Validation>}
      </NaturalInput.DescriptionAndValidation>
    </NaturalInput.Root>
  );
};
