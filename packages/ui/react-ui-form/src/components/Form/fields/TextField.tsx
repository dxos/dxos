//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

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
  const { status, error } = getStatus();
  const value = getValue();
  if (readonly && value == null) {
    return null;
  }

  // TODO(burdon): Factor out common layout.
  const str = String(value ?? '');
  if (readonly === 'static' && inline) {
    return <p>{str}</p>;
  }

  return (
    <Input.Root validationValence={status}>
      {!inline && <FormFieldLabel error={error} readonly={readonly} label={label} />}
      {readonly === 'static' ? (
        <p>{str}</p>
      ) : (
        <Input.TextInput
          disabled={!!readonly}
          placeholder={placeholder}
          value={str}
          onChange={(event) => onValueChange(type, event.target.value)}
          onBlur={onBlur}
        />
      )}
      {inline && <Input.Validation>{error}</Input.Validation>}
    </Input.Root>
  );
};
