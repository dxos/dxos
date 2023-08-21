//
// Copyright 2023 DXOS.org
//

import React, { ReactNode } from 'react';

import { Input } from '@dxos/aurora';

export type LargeInputProps = {
  validationMessage?: string;
  label?: ReactNode;
  disabled?: boolean;
  placeholder?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

export const LargeInput = (props: LargeInputProps) => {
  const { disabled, validationMessage, placeholder, label, onChange } = props;
  return (
    <Input.Root>
      <Input.Label>{label}</Input.Label>
      <Input.TextInput
        placeholder={placeholder}
        classNames='plb-3 mbs-2 text-center'
        disabled={disabled}
        onChange={onChange}
      />
      <Input.DescriptionAndValidation>
        {validationMessage && <Input.Validation>{validationMessage}</Input.Validation>}
      </Input.DescriptionAndValidation>
    </Input.Root>
  );
};
