//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Field, type TextareaProps } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../../FormField.tsx';
import { presentationFor } from '../../presentation.tsx';

export const TextAreaField = ({
  type,
  format,
  readonly,
  placeholder,
  presentation,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<string>) => {
  const handleChange = useCallback<NonNullable<TextareaProps['onChange']>>(
    (event) => onValueChange(type, event.target.value),
    [type, onValueChange],
  );
  const value = getValue() ?? '';
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  return (
    <Field.Textarea
      rows={5}
      disabled={!!readonly}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
    />
  );
};
