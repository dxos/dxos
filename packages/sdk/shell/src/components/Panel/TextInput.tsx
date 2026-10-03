//
// Copyright 2023 DXOS.org
//

import React, { type ChangeEventHandler, type ReactNode } from 'react';

import { Field as NaturalField, type InputProps as NaturalInputProps } from '@dxos/react-ui';

export type InputProps = NaturalInputProps & {
  validationMessage?: string;
  label?: ReactNode;
  disabled?: boolean;
  placeholder?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
};

/**
 * @deprecated use react-ui directly.
 */
export const TextInput = ({ validationMessage, label, ...props }: InputProps) => {
  return (
    <NaturalField.Root>
      <NaturalField.Label>{label}</NaturalField.Label>
      <NaturalField.Input {...props} classNames='py-2 mt-2 text-center' />
      {validationMessage && <NaturalField.ErrorText>{validationMessage}</NaturalField.ErrorText>}
    </NaturalField.Root>
  );
};
