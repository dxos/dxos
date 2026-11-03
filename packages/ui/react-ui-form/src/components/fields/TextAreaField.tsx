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
  label,
  placeholder,
  presentation,
  jsonPath,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<string>) => {
  const value = getValue() ?? '';
  const inPlace = presentation === 'title' || presentation === 'plain';
  const { isStatic, showLabel } = presentationFor(presentation);
  if (isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  return (
    <Input.Textarea
      autoResize
      variant={inPlace ? 'plain' : 'default'}
      {...(inPlace && { rows: 1 })}
      data-testid={jsonPath}
      disabled={!!readonly}
      placeholder={placeholder}
      // A row that draws no label names its control itself.
      aria-label={showLabel ? undefined : label || undefined}
      value={value}
      onChange={(event) => onValueChange(type, event.target.value)}
      onBlur={onBlur}
    />
  );
};
