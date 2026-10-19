//
// Copyright 2025 DXOS.org
//

import { format as formatDate } from 'date-fns';

/** ISO 8601 → `YYYY-MM-DDTHH:mm` in the user's local timezone. */
export const isoToLocalDateTime = (value: string | undefined): string => {
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
export const localDateTimeToIso = (value: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  // Treat the input as local time. `new Date('YYYY-MM-DDTHH:mm')` parses as local.
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
