//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { type TextInputProps, Input } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormRow } from '../../FormRow';

export const TextField = ({
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
    <FormRow<string> readonly={readonly} {...props}>
      {({ value = '' }) => (
        <Input.TextInput
          noAutoFill
          disabled={!!readonly}
          placeholder={placeholder}
          value={value}
          onBlur={onBlur}
          onChange={handleChange}
        />
      )}
    </FormRow>
  );
};
