//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Format } from '@dxos/echo';
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

  // An opaque identifier is not prose: no spellcheck squiggles, no autocorrect, no capitalisation.
  const key = format === Format.TypeFormat.Key;
  return (
    <Field.Input
      noAutoFill
      disabled={!!readonly}
      placeholder={placeholder}
      value={value}
      onBlur={onBlur}
      onChange={handleChange}
      {...(key && { classNames: 'font-mono', spellCheck: false, autoCorrect: 'off', autoCapitalize: 'none' })}
    />
  );
};
