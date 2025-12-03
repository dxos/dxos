//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Input, type TextInputProps } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldWrapper } from '../FormFieldComponent';

export const TextField = ({
  type,
  readonly,
  placeholder,
  onValueChange,
  onBlur,
  ...props
}: FormFieldComponentProps<string>) => {
  const handleChange = useCallback<NonNullable<TextInputProps['onChange']>>(
    (event) => onValueChange(type, event.target.value),
    [type, onValueChange],
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
