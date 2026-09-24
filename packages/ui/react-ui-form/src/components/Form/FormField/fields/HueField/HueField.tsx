//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { HuePicker } from '@dxos/react-ui-pickers';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../../FormField.tsx';
import { presentationFor } from '../../presentation.tsx';

/**
 * A control whose value is one of the theme's hues: the hue picker, with the field's label as the
 * picker's own label so an unset value still reads as the field.
 */
export const HueField = ({
  type,
  format,
  label,
  readonly,
  presentation,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<string | undefined>) => {
  // A pick is a commit: the picker never blurs, so it commits itself.
  const handleChange = useCallback(
    (hue: string) => {
      onValueChange(type, hue);
      onBlur();
    },
    [onValueChange, onBlur, type],
  );
  const handleReset = useCallback(() => {
    onValueChange(type, undefined);
    onBlur();
  }, [onValueChange, onBlur, type]);
  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  return <HuePicker label={label} value={value} disabled={!!readonly} onChange={handleChange} onReset={handleReset} />;
};

HueField.displayName = 'Form.HueField';
