//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Field, type SwitchProps } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../../FormField.tsx';
import { presentationFor } from '../../presentation.tsx';

export const BooleanField = ({
  type,
  format,
  readonly,
  presentation,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<boolean>) => {
  // A toggle is a commit: the switch never blurs, so it commits itself.
  const handleChange = useCallback<NonNullable<SwitchProps['onCheckedChange']>>(
    (value) => {
      onValueChange(type, value);
      onBlur();
    },
    [type, onValueChange, onBlur],
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

// A toggle reads with its text beside it; the row lays the label there.
BooleanField.labelPlacement = 'beside' as const;
