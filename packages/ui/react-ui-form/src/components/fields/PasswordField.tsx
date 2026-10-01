//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui/next';

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
    <Next.PasswordInput
      ignorePasswordManagers
      disabled={!!readonly}
      placeholder={placeholder}
      value={value}
      onValueChange={(next) => onValueChange(type, next)}
    />
  );
};
