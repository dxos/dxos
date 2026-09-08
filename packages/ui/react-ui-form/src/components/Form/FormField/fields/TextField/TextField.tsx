//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Field, type InputProps } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormField } from '../../FormField';

export const TextField = ({
  type,
  readonly,
  placeholder,
  onBlur,
  onValueChange,
  ...props
}: FormFieldRendererProps<string>) => {
  const handleChange = useCallback<NonNullable<InputProps['onChange']>>(
    (event) => onValueChange(type, event.target.value),
    [type, onValueChange],
  );

  return (
    <FormField<string> readonly={readonly} {...props}>
      {({ value = '' }) => (
        <Field.Input
          noAutoFill
          disabled={!!readonly}
          placeholder={placeholder}
          value={value}
          onBlur={onBlur}
          onChange={handleChange}
        />
      )}
    </FormField>
  );
};
