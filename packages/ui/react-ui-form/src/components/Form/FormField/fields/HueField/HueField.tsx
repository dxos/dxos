//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { HuePicker } from '@dxos/react-ui-pickers';

import { type FormFieldRendererProps } from '#types';

import { FormField } from '../../FormField';

/**
 * A field whose value is one of the theme's hues: the hue picker in a form row, with the field's label
 * as the picker's own label so an unset value still reads as the field.
 */
export const HueField = ({ type, readonly, onValueChange, ...props }: FormFieldRendererProps<string | undefined>) => {
  const handleChange = useCallback((hue: string) => onValueChange(type, hue), [onValueChange, type]);
  const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
  return (
    <FormField<string | undefined> readonly={readonly} {...props}>
      {({ value }) => (
        <HuePicker
          label={props.label}
          value={value}
          disabled={!!readonly}
          onChange={handleChange}
          onReset={handleReset}
        />
      )}
    </FormField>
  );
};

HueField.displayName = 'Form.HueField';
