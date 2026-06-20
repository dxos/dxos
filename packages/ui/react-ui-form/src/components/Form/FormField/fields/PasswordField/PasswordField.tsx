//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Input, type TextInputProps } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormFieldWrapper } from '../../FormFieldWrapper';

/**
 * Masked text input for secrets (passwords, API tokens, app passwords).
 * Selected by `Format.TypeFormat.Password` on a string schema field.
 */
export const PasswordField = ({
  type,
  readonly,
  placeholder,
  onBlur,
  onValueChange,
  ...props
}: FormFieldRendererProps<string>) => {
  const handleChange = useCallback<NonNullable<TextInputProps['onChange']>>(
    (event) => onValueChange(type, event.target.value),
    [type, onValueChange],
  );

  return (
    <FormFieldWrapper<string> readonly={readonly} {...props}>
      {({ value = '' }) => (
        <Input.TextInput
          noAutoFill
          type='password'
          autoComplete='new-password'
          disabled={!!readonly}
          placeholder={placeholder}
          value={value}
          onBlur={onBlur}
          onChange={handleChange}
        />
      )}
    </FormFieldWrapper>
  );
};
