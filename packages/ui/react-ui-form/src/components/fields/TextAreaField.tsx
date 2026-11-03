//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Input from '@dxos/react-ui/Input';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';

export const TextAreaField = ({
  type,
  format,
  readonly,
  placeholder,
  presentation,
  appearance,
  jsonPath,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<string>) => {
  const value = getValue() ?? '';
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  return (
    <Input.Textarea
      autoResize
      variant={appearance ? 'subdued' : 'default'}
      data-testid={jsonPath}
      disabled={!!readonly}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onValueChange(type, event.target.value)}
      onBlur={onBlur}
    />
  );
};
