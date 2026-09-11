//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Field, type InputProps } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../../FormField.tsx';
import { presentationFor } from '../../presentation.tsx';

export const TextField = ({
  type,
  format,
  readonly,
  placeholder,
  presentation,
  getValue,
  onBlur,
  onValueChange,
}: FormFieldRendererProps<string>) => {
  const handleChange = useCallback<NonNullable<InputProps['onChange']>>(
    (event) => onValueChange(type, event.target.value),
    [type, onValueChange],
  );
  const value = getValue() ?? '';
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  return (
    <Field.Input
      noAutoFill
      disabled={!!readonly}
      placeholder={placeholder}
      value={value}
      onBlur={onBlur}
      onChange={handleChange}
    />
  );
};
