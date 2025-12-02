//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useCallback } from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldWrapper } from '../FormFieldComponent';

export const TextField = ({
  ast,
  readonly,
  placeholder,
  onValueChange,
  onBlur,
  ...props
}: FormFieldComponentProps<string>) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onValueChange(ast, event.target.value),
    [ast, onValueChange],
  );

  return (
    <FormFieldWrapper<string> readonly={readonly} {...props}>
      {({ value = '' }) => (
        <Input.TextInput
          noAutoFill
          disabled={!!readonly}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
        />
      )}
    </FormFieldWrapper>
  );
};
