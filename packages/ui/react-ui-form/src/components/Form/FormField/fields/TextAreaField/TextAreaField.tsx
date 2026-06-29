//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { type TextAreaProps, Input } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormRow } from '../../FormRow';

export const TextAreaField = ({
  type,
  readonly,
  placeholder,
  onValueChange,
  onBlur,
  ...props
}: FormFieldRendererProps<string>) => {
  const handleChange = useCallback<NonNullable<TextAreaProps['onChange']>>(
    (event) => onValueChange(type, event.target.value),
    [type, onValueChange],
  );

  return (
    <FormRow<string> readonly={readonly} {...props}>
      {({ value = '' }) => (
        <Input.TextArea
          rows={5}
          disabled={!!readonly}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
        />
      )}
    </FormRow>
  );
};
