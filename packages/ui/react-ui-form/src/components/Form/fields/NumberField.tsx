//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input } from '@dxos/react-ui';
import { safeParseFloat } from '@dxos/util';

import { type FormFieldComponentProps } from '../FormFieldComponent';
import { FormFieldWrapper } from '../FormFieldWrapper';

export const NumberField = ({
  type,
  label,
  inline,
  readonly,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldComponentProps<number>) => {
  return (
    <FormFieldWrapper<number>
      inline={inline}
      readonly={readonly}
      label={label}
      getStatus={getStatus}
      getValue={getValue}
    >
      {({ value }) => (
        <Input.TextInput
          type='number'
          disabled={!!readonly}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(event) => onValueChange(type, safeParseFloat(event.target.value) || 0)}
          onBlur={onBlur}
        />
      )}
    </FormFieldWrapper>
  );
};
