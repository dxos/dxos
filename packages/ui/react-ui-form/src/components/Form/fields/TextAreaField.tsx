//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Input, type TextAreaProps } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldWrapper } from '../FormFieldComponent';

export const TextAreaField = ({
  type,
  readonly,
  placeholder,
  onValueChange,
  onBlur,
  ...props
}: FormFieldComponentProps<string>) => {
  const handleChange = useCallback<NonNullable<TextAreaProps['onChange']>>(
    (event) => onValueChange(type, event.target.value),
    [type, onValueChange],
  );

  return (
    <FormFieldWrapper<string> readonly={readonly} {...props}>
      {({ value = '' }) => (
        <Input.TextArea
          rows={3}
          disabled={!!readonly}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
        />
      )}
    </FormFieldWrapper>
  );
};
