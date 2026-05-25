//
// Copyright 2026 DXOS.org
//

import { format as formatDate } from 'date-fns';
import React, { type ChangeEvent, useCallback } from 'react';

import { Format } from '@dxos/echo';
import { DatePicker, Input } from '@dxos/react-ui';

import { type FormFieldComponentProps, FormFieldWrapper } from '../FormFieldComponent';

/**
 * Stored value shapes:
 * - `Format.DateTime` -> ISO 8601 (`2018-11-13T20:20:39.000Z`).
 * - `Format.Date`     -> `YYYY-MM-DD`.
 * - `Format.Time`     -> `HH:mm:ss`.
 */

const parseDateTime = (value: string | undefined): Date | undefined => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseDateOnly = (value: string | undefined): Date | undefined => {
  if (!value) {
    return undefined;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  // Reject impossible calendar dates (e.g. 2026-02-31) which Date() would otherwise silently shift.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return date;
};

const encodeDateOnly = (date: Date | undefined): string | undefined =>
  date ? formatDate(date, 'yyyy-MM-dd') : undefined;

const encodeDateTime = (date: Date | undefined): string | undefined => date?.toISOString();

const applyHoursMinutes = (date: Date | undefined, hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map((part) => Number.parseInt(part, 10));
  const next = date ? new Date(date) : new Date();
  next.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return next;
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
  const isDateOnly = format === Format.TypeFormat.Date;
  const isTimeOnly = format === Format.TypeFormat.Time;

  const handleTimeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onValueChange(type, event.target.value),
    [type, onValueChange],
  );

  const handleDateChange = useCallback(
    (next: Date | undefined) => {
      const encoded = isDateOnly ? encodeDateOnly(next) : encodeDateTime(next);
      onValueChange(type, encoded as string);
    },
    [type, isDateOnly, onValueChange],
  );

  return (
    <FormFieldWrapper<string> readonly={readonly} {...props}>
      {({ value }) => {
        if (isTimeOnly) {
          return <Input.Time disabled={!!readonly} value={value ?? ''} onChange={handleTimeChange} onBlur={onBlur} />;
        }

        const date = isDateOnly ? parseDateOnly(value) : parseDateTime(value);
        const triggerFormat = isDateOnly ? 'PPP' : 'PPp';
        const withTime = !isDateOnly;

        return (
          <DatePicker.Root mode='single' withTime={withTime} value={date} onValueChange={handleDateChange}>
            <DatePicker.Trigger disabled={!!readonly} placeholder={placeholder} format={triggerFormat} />
            <DatePicker.Content>
              <DatePicker.Calendar />
              {withTime && (
                <Input.Root>
                  <Input.Time
                    value={date ? formatDate(date, 'HH:mm') : ''}
                    onChange={(event) => handleDateChange(applyHoursMinutes(date, event.target.value))}
                  />
                </Input.Root>
              )}
            </DatePicker.Content>
          </DatePicker.Root>
        );
      }}
    </FormFieldWrapper>
  );
};
