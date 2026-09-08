//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Field, type SwitchProps } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormField } from '../../FormField';

export const BooleanField = ({ type, readonly, onValueChange, ...props }: FormFieldRendererProps<boolean>) => {
  const handleChange = useCallback<NonNullable<SwitchProps['onCheckedChange']>>(
    (value) => onValueChange?.(type, value),
    [type, onValueChange],
  );

  return (
    <FormField<boolean> readonly={readonly} {...props}>
      {({ value }) => (
        <Field.Block>
          <Field.Switch disabled={!!readonly} checked={value} onCheckedChange={handleChange} />
        </Field.Block>
      )}
    </FormField>
  );
};
