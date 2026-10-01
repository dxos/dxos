//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Format } from '@dxos/echo';
import { Next } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';

export const TextField = ({
  type,
  format,
  readonly,
  placeholder,
  presentation,
  autoFocus,
  getValue,
  onBlur,
  onValueChange,
}: FormFieldRendererProps<string>) => {
  const value = getValue() ?? '';
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  // An opaque identifier is not prose: no spellcheck squiggles, no autocorrect, no capitalisation.
  const key = format === Format.TypeFormat.Key;
  return (
    <Next.Input
      noAutoFill
      autoFocus={autoFocus}
      disabled={!!readonly}
      placeholder={placeholder}
      value={value}
      onBlur={onBlur}
      onChange={(event) => onValueChange(type, event.target.value)}
      {...(key && { variant: 'mono', spellCheck: false, autoCorrect: 'off', autoCapitalize: 'none' })}
    />
  );
};
