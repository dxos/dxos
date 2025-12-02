//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useCallback } from 'react';

import { Input } from '@dxos/react-ui';
import { safeParseFloat } from '@dxos/util';

import { type FormFieldComponentProps, FormFieldWrapper } from '../FormFieldComponent';

export const NumberField = ({
  type,
  readonly,
  placeholder,
  onValueChange,
  onBlur,
  ...props
}: FormFieldComponentProps<number>) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onValueChange(type, safeParseFloat(event.target.value) || 0),
    [type, onValueChange],
  );

  return (
    <FormFieldWrapper<number> readonly={readonly} {...props}>
      {({ value = '' }) => (
        <Input.TextInput
          type='number'
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
