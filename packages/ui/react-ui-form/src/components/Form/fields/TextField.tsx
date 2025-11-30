//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldWrapper } from '../FormFieldComponent';

export const TextField = ({
  type,
  label,
  inline,
  readonly,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldComponentProps<string>) => {
  return (
    <FormFieldWrapper<string>
      inline={inline}
      readonly={readonly}
      label={label}
      getStatus={getStatus}
      getValue={getValue}
    >
      {({ value = '' }) => (
        <Input.TextInput
          noAutoFill
          disabled={!!readonly}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(type, event.target.value)}
          onBlur={onBlur}
        />
      )}
    </FormFieldWrapper>
  );
};
