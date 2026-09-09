//
// Copyright 2026 DXOS.org
//

import { format as formatDate } from 'date-fns';
import React, { useCallback } from 'react';

import { Format } from '@dxos/echo';
import { Field } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../../FormField';
import { presentationFor } from '../../presentation';

/**
 * Stored value shapes:
 * - `Format.DateTime` -> ISO 8601 (`2018-11-13T20:20:39.000Z`).
 * - `Format.Date`     -> `YYYY-MM-DD`.
 * - `Format.Time`     -> `HH:mm:ss`.
 *
 * Segmented input value shapes (react-aria-components-backed):
 * - `Field.DateTime` -> `YYYY-MM-DDTHH:mm` in local time.
 * - `Field.Date`     -> `YYYY-MM-DD`.
 * - `Field.Time`     -> `HH:mm`.
 */

/** ISO 8601 → `YYYY-MM-DDTHH:mm` in the user's local timezone. */
const isoToLocalDateTime = (value: string | undefined): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return formatDate(date, "yyyy-MM-dd'T'HH:mm");
};

/** `YYYY-MM-DDTHH:mm` (local) → ISO 8601 with timezone. */
const localDateTimeToIso = (value: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  // Treat the input as local time. `new Date('YYYY-MM-DDTHH:mm')` parses as local.
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const DateField = ({
  type,
  format,
  readonly,
  presentation,
  getValue,
  onValueChange,
}: FormFieldRendererProps<string>) => {
  const handleSimpleChange = useCallback((next: string) => onValueChange(type, next), [type, onValueChange]);

  const handleDateTimeChange = useCallback(
    (next: string) => {
      const iso = localDateTimeToIso(next);
      onValueChange(type, iso as string);
    },
    [type, onValueChange],
  );

  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  switch (format) {
    case Format.TypeFormat.Date:
      return (
        <div className='grid grid-cols-[minmax(0,1fr)_min-content] gap-1 items-stretch tabular-nums'>
          <Field.Date
            classNames='overflow-hidden'
            disabled={readonly}
            value={value ?? ''}
            onValueChange={handleSimpleChange}
          />
          <Field.TriggerIcon />
        </div>
      );
    case Format.TypeFormat.Time:
      return (
        <Field.Time
          classNames='tabular-nums'
          disabled={!!readonly}
          value={value ?? ''}
          onValueChange={handleSimpleChange}
        />
      );
    case Format.TypeFormat.DateTime:
    default:
      return (
        <div className='grid grid-cols-[minmax(0,1fr)_min-content] gap-1 items-stretch tabular-nums'>
          <Field.DateTime
            classNames='overflow-hidden'
            disabled={readonly}
            value={isoToLocalDateTime(value)}
            onValueChange={handleDateTimeChange}
          />
          <Field.TriggerIcon />
        </div>
      );
  }
};
