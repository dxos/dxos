//
// Copyright 2023 DXOS.org
//

import React, { type ChangeEventHandler, type ReactNode } from 'react';

import * as Field from '@dxos/react-ui/Field';
import * as Input from '@dxos/react-ui/Input';

export type InputProps = Input.InputProps & {
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
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      <Input.Input {...props} classNames='py-2 mt-2 text-center' />
      {validationMessage && <Field.ErrorText>{validationMessage}</Field.ErrorText>}
    </Field.Root>
  );
};
