//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldWrapper } from '../FormFieldComponent';

export const TextAreaField = ({
  type,
  readonly,
  placeholder,
  onValueChange,
  onBlur,
  ...props
}: FormFieldComponentProps<string>) => {
  return (
    <FormFieldWrapper<string> readonly={readonly} {...props}>
      {({ value = '' }) => (
        <Input.TextArea
          rows={3}
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
