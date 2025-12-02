//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldWrapper } from '../FormFieldComponent';

export const BooleanField = ({ ast, readonly, onValueChange, ...props }: FormFieldComponentProps<boolean>) => {
  const handleChange = useCallback((value: boolean) => onValueChange(ast, value), [ast, onValueChange]);

export const BooleanField = ({ type, readonly, onValueChange, ...props }: FormFieldComponentProps<boolean>) => {
  return (
    <FormFieldWrapper<boolean> readonly={readonly} {...props}>
      {({ value }) => <Input.Switch disabled={!!readonly} checked={value} onCheckedChange={handleChange} />}
    </FormFieldWrapper>
  );
};
