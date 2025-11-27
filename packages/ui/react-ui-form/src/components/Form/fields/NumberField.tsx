//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

export const NumberField = ({
  type,
  label,
  inputOnly,
  readonly,
  placeholder,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldComponentProps) => {
  const { status, error } = getStatus();

  return readonly && !getValue() ? null : readonly === 'static' && inputOnly ? (
    <p>{getValue() ?? ''}</p>
  ) : (
    <Input.Root validationValence={status}>
      {!inputOnly && <FormFieldLabel error={error} label={label} />}
      {readonly === 'static' ? (
        <p>{getValue() ?? ''}</p>
      ) : (
        <Input.TextInput
          type='number'
          disabled={!!readonly}
          placeholder={placeholder}
          value={getValue()}
          onChange={(event) => onValueChange(type, event.target.value)}
          onBlur={onBlur}
        />
      )}
      {inputOnly && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};
