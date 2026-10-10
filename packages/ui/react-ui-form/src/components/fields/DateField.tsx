//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Format } from '@dxos/echo';
import * as Input from '@dxos/react-ui/Input';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';
import { isoToLocalDateTime, localDateTimeToIso } from './date-value.ts';

/**
 * Stored shapes: `Format.DateTime` is ISO 8601, `Format.Date` `YYYY-MM-DD`, `Format.Time` `HH:mm:ss`; DateInput takes
 * the native strings, so a date-time converts through local time and a time keeps its seconds.
 */
export const DateField = ({
  type,
  format,
  readonly,
  presentation,
  getValue,
  onValueChange,
}: FormFieldRendererProps<string | undefined>) => {
  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  switch (format) {
    case Format.TypeFormat.Date:
      return (
        <Input.Date
          type='date'
          disabled={!!readonly}
          value={value ?? ''}
          onValueChange={(next) => onValueChange(type, next || undefined)}
        />
      );
    case Format.TypeFormat.Time:
      return (
        <Input.Date
          type='time'
          granularity='second'
          disabled={!!readonly}
          value={value ?? ''}
          onValueChange={(next) => onValueChange(type, next || undefined)}
        />
      );
    default:
      return (
        <Input.Date
          type='datetime-local'
          disabled={!!readonly}
          value={isoToLocalDateTime(value)}
          onValueChange={(next) => onValueChange(type, localDateTimeToIso(next))}
        />
      );
  }
};
