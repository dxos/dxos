//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

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
}: FormFieldComponentProps) => {
  const { status, error } = getStatus();

  return readonly && !getValue() ? null : readonly === 'static' && inline ? (
    <p>{getValue() ?? ''}</p>
  ) : (
    <Input.Root validationValence={status}>
      {!inline && <FormFieldLabel error={error} readonly={readonly} label={label} />}
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
      {inline && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};
