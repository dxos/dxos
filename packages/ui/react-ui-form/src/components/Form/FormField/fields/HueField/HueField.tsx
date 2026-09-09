//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { HuePicker } from '@dxos/react-ui-pickers';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../../FormField';
import { presentationFor } from '../../presentation';

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
}: FormFieldRendererProps<string | undefined>) => {
  const handleChange = useCallback((hue: string) => onValueChange(type, hue), [onValueChange, type]);
  const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  return <HuePicker label={label} value={value} disabled={!!readonly} onChange={handleChange} onReset={handleReset} />;
};

HueField.displayName = 'Form.HueField';
