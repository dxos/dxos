//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Input, type SwitchProps } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldWrapper } from '../FormFieldComponent';

export const BooleanField = ({ type, readonly, onValueChange, ...props }: FormFieldComponentProps<boolean>) => {
  const handleChange = useCallback<NonNullable<SwitchProps['onCheckedChange']>>(
    (value) => onValueChange?.(type, value),
    [type, onValueChange],
  );

  return (
    <FormFieldWrapper<boolean> readonly={readonly} {...props}>
      {({ value }) => <Input.Switch disabled={!!readonly} checked={value} onCheckedChange={handleChange} />}
    </FormFieldWrapper>
  );
};
