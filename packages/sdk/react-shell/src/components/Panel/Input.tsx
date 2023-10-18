//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode } from 'react';

import { Input as AuroraInput, type TextInputProps } from '@dxos/aurora';

export type LargeInputProps = TextInputProps & {
  validationMessage?: string;
  label?: ReactNode;
  disabled?: boolean;
  placeholder?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

export const Input = ({ validationMessage, label, ...props }: LargeInputProps) => {
  return (
    <AuroraInput.Root>
      <AuroraInput.Label>{label}</AuroraInput.Label>
      <AuroraInput.TextInput {...props} classNames='plb-3 mbs-2 text-center' />
      <AuroraInput.DescriptionAndValidation>
        {validationMessage && <AuroraInput.Validation>{validationMessage}</AuroraInput.Validation>}
      </AuroraInput.DescriptionAndValidation>
    </AuroraInput.Root>
  );
};
