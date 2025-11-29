//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps } from '../FormFieldComponent';
import { FormFieldWrapper } from '../FormFieldWrapper';

export const TextAreaField = ({
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
      {({ value }) => (
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
