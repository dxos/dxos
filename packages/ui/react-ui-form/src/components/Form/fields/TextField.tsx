//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps } from '../FormFieldComponent';
import { FormFieldWrapper } from '../FormFieldWrapper';

// TODO(burdon): Lines annotation.
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
}: FormFieldComponentProps) => {
  return (
    <FormFieldWrapper
      inline={inline}
      readonly={readonly}
      label={label}
      getStatus={getStatus}
      getValue={getValue}
      Component={({ str }) => (
        <Input.TextInput
          disabled={!!readonly}
          placeholder={placeholder}
          value={str}
          onChange={(event) => onValueChange(type, event.target.value)}
          onBlur={onBlur}
        />
      )}
    />
  );
};
