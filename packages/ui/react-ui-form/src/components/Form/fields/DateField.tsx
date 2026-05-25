//
// Copyright 2026 DXOS.org
//

import { format as formatDate } from 'date-fns';
import React, { type ChangeEvent, useCallback } from 'react';

import { Format } from '@dxos/echo';
import { Input } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldWrapper } from '../FormFieldComponent';

/**
 * Stored value shapes:
 * - `Format.DateTime` -> ISO 8601 (`2018-11-13T20:20:39.000Z`).
 * - `Format.Date`     -> `YYYY-MM-DD`.
 * - `Format.Time`     -> `HH:mm:ss`.
 *
 * Native input value shapes:
 * - `<input type='datetime-local'>` -> `YYYY-MM-DDTHH:mm` in local time.
 * - `<input type='date'>`           -> `YYYY-MM-DD`.
 * - `<input type='time'>`           -> `HH:mm`.
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
  placeholder,
  onValueChange,
  onBlur,
  ...props
}: FormFieldComponentProps<string>) => {
  const handleDateOnlyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onValueChange(type, event.target.value),
    [type, onValueChange],
  );

  const handleTimeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onValueChange(type, event.target.value),
    [type, onValueChange],
  );

  const handleDateTimeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const iso = localDateTimeToIso(event.target.value);
      onValueChange(type, iso as string);
    },
    [type, onValueChange],
  );

  return (
    <FormFieldWrapper<string> readonly={readonly} {...props}>
      {({ value }) => {
        switch (format) {
          case Format.TypeFormat.Date:
            return (
              <Input.Date
                disabled={!!readonly}
                placeholder={placeholder}
                value={value ?? ''}
                onChange={handleDateOnlyChange}
                onBlur={onBlur}
              />
            );
          case Format.TypeFormat.Time:
            return (
              <Input.Time
                disabled={!!readonly}
                placeholder={placeholder}
                value={value ?? ''}
                onChange={handleTimeChange}
                onBlur={onBlur}
              />
            );
          case Format.TypeFormat.DateTime:
          default:
            return (
              <Input.DateTime
                disabled={!!readonly}
                placeholder={placeholder}
                value={isoToLocalDateTime(value)}
                onChange={handleDateTimeChange}
                onBlur={onBlur}
              />
            );
        }
      }}
    </FormFieldWrapper>
  );
};
