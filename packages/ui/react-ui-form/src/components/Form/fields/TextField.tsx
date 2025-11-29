//
// Copyright 2024 DXOS.org
//

import React, { useEffect } from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps } from '../FormFieldComponent';
import { FormFieldWrapper } from '../FormFieldWrapper';

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
  useEffect(() => {
    console.log('mounted', type);
    return () => {
      console.log('unmounted', type);
    };
  }, []);

  return (
    <FormFieldWrapper<string>
      inline={inline}
      readonly={readonly}
      label={label}
      getStatus={getStatus}
      getValue={getValue}
      Component={({ value }) => (
        <Input.TextInput
          {...{ 'data-1p-ignore': true }}
          disabled={!!readonly}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(type, event.target.value)}
          onBlur={onBlur}
        />
      )}
    />
  );
};
