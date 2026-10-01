//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Next } from '@dxos/react-ui/next';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../../FormField.tsx';
import { presentationFor } from '../../presentation.tsx';

export const PasswordField = ({
  type,
  format,
  readonly,
  placeholder,
  presentation,
  getValue,
  onBlur,
  onValueChange,
}: FormFieldRendererProps<string>) => {
  const handleChange = useCallback<NonNullable<Next.InputProps['onChange']>>(
    (event) => onValueChange(type, event.target.value),
    [type, onValueChange],
  );
  const value = getValue() ?? '';
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  return (
    <Next.PasswordInput
      noAutoFill
      spellCheck={false}
      disabled={!!readonly}
      placeholder={placeholder}
      value={value}
      onBlur={onBlur}
      onChange={handleChange}
    />
  );
};
