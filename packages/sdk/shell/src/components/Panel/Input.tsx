//
// Copyright 2023 DXOS.org
//

import React, { type ChangeEventHandler, type ReactNode } from 'react';

import { Input as UiInput, type TextInputProps } from '@dxos/react-ui';

export type LargeInputProps = TextInputProps & {
  validationMessage?: string;
  label?: ReactNode;
  disabled?: boolean;
  placeholder?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
};

export const Input = ({ validationMessage, label, ...props }: LargeInputProps) => {
  return (
    <UiInput.Root>
      <UiInput.Label>{label}</UiInput.Label>
      <UiInput.TextInput {...props} classNames='plb-3 mbs-2 text-center' />
      <UiInput.DescriptionAndValidation>
        {validationMessage && <UiInput.Validation>{validationMessage}</UiInput.Validation>}
      </UiInput.DescriptionAndValidation>
    </UiInput.Root>
  );
};
