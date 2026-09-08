//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Field, type SwitchProps } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../../FormField';
import { presentationFor } from '../../presentation';

export const BooleanField = ({
  type,
  format,
  readonly,
  presentation,
  getValue,
  onValueChange,
}: FormFieldRendererProps<boolean>) => {
  const handleChange = useCallback<NonNullable<SwitchProps['onCheckedChange']>>(
    (value) => onValueChange?.(type, value),
    [type, onValueChange],
  );
  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  return (
    <Field.Block>
      <Field.Switch disabled={!!readonly} checked={value} onCheckedChange={handleChange} />
    </Field.Block>
  );
};
