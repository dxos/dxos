//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Input from '@dxos/react-ui/Input';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';

export const PasswordField = ({
  type,
  format,
  readonly,
  placeholder,
  presentation,
  getValue,
  onValueChange,
}: FormFieldRendererProps<string>) => {
  const value = getValue() ?? '';
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={'•'.repeat(value.length)} format={format} />;
  }

  return (
    <Input.Password
      ignorePasswordManagers
      disabled={!!readonly}
      placeholder={placeholder}
      value={value}
      onValueChange={(next) => onValueChange(type, next)}
    />
  );
};
