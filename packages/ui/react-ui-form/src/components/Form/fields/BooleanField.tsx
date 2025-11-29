//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps } from '../FormFieldComponent';
import { FormFieldWrapper } from '../FormFieldWrapper';

export const BooleanField = ({
  type,
  label,
  inline,
  readonly,
  getStatus,
  getValue,
  onValueChange,
}: FormFieldComponentProps<boolean>) => {
  return (
    <FormFieldWrapper<boolean>
      inline={inline}
      readonly={readonly}
      label={label}
      getStatus={getStatus}
      getValue={getValue}
      Component={({ value }) => (
        <Input.Switch disabled={!!readonly} checked={value} onCheckedChange={(value) => onValueChange(type, value)} />
      )}
    />
  );
};
