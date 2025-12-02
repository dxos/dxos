//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useCallback } from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldWrapper } from '../FormFieldComponent';

export const TextAreaField = ({
  ast,
  readonly,
  placeholder,
  onValueChange,
  onBlur,
  ...props
}: FormFieldComponentProps<string>) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => onValueChange(ast, event.target.value),
    [ast, onValueChange],
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
