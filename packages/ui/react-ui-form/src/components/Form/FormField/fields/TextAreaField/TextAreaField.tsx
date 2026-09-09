//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Field, type TextareaProps } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormField } from '../../FormField';

export const TextAreaField = ({
  type,
  readonly,
  placeholder,
  onValueChange,
  onBlur,
  ...props
}: FormFieldRendererProps<string>) => {
  const handleChange = useCallback<NonNullable<TextareaProps['onChange']>>(
    (event) => onValueChange(type, event.target.value),
    [type, onValueChange],
  );

  return (
    <FormField<string> readonly={readonly} {...props}>
      {({ value = '' }) => (
        <Field.Textarea
          rows={5}
          disabled={!!readonly}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
        />
      )}
    </FormField>
  );
};
