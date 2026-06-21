//
// Copyright 2026 DXOS.org
//

import { format as formatDate } from 'date-fns';
import React, { useCallback } from 'react';

import { Format } from '@dxos/echo';
import { Input } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';

import { FormFieldWrapper } from '../../FormFieldWrapper';

/**
 * Stored value shapes:
 * - `Format.DateTime` -> ISO 8601 (`2018-11-13T20:20:39.000Z`).
 * - `Format.Date`     -> `YYYY-MM-DD`.
 * - `Format.Time`     -> `HH:mm:ss`.
 *
 * Segmented input value shapes (react-aria-components-backed):
 * - `Input.DateTime` -> `YYYY-MM-DDTHH:mm` in local time.
 * - `Input.Date`     -> `YYYY-MM-DD`.
 * - `Input.Time`     -> `HH:mm`.
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
  placeholder: _placeholder,
  onValueChange,
  onBlur: _onBlur,
  ...props
}: FormFieldRendererProps<string>) => {
  const handleSimpleChange = useCallback((next: string) => onValueChange(type, next), [type, onValueChange]);

  const handleDateTimeChange = useCallback(
    (next: string) => {
      const iso = localDateTimeToIso(next);
      onValueChange(type, iso as string);
    },
    [type, onValueChange],
  );

  return (
    <FormFieldWrapper<string> readonly={readonly} format={format} {...props}>
      {({ value }) => {
        switch (format) {
          case Format.TypeFormat.Date:
            return (
              <div className='grid grid-cols-[minmax(0,1fr)_min-content] gap-1 items-stretch'>
                <Input.Date
                  classNames='min-w-0 overflow-hidden'
                  disabled={!!readonly}
                  value={value ?? ''}
                  onValueChange={handleSimpleChange}
                />
                <Input.TriggerIcon />
              </div>
            );
          case Format.TypeFormat.Time:
            return <Input.Time disabled={!!readonly} value={value ?? ''} onValueChange={handleSimpleChange} />;
          case Format.TypeFormat.DateTime:
          default:
            return (
              <div className='grid grid-cols-[minmax(0,1fr)_min-content] gap-1 items-stretch'>
                <Input.DateTime
                  classNames='min-w-0 overflow-hidden'
                  disabled={!!readonly}
                  value={isoToLocalDateTime(value)}
                  onValueChange={handleDateTimeChange}
                />
                <Input.TriggerIcon />
              </div>
            );
        }
      }}
    </FormFieldWrapper>
  );
};
