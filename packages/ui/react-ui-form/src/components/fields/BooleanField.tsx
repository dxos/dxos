//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { useFormContext } from '../../hooks/index.ts';
import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';

/** A Switch that labels itself, except in a settings row, whose header column holds the label. */
export const BooleanField = ({
  type,
  format,
  label,
  readonly,
  presentation,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<boolean>) => {
  const { variant } = useFormContext('Form.BooleanField');
  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  return (
    <Next.Switch
      label={variant === 'settings' ? undefined : label}
      disabled={!!readonly}
      checked={!!value}
      // A toggle is a commit: the switch never blurs, so it commits itself.
      onCheckedChange={({ checked }) => {
        onValueChange(type, checked);
        onBlur();
      }}
    />
  );
};

BooleanField.labelPlacement = 'beside' as const;
