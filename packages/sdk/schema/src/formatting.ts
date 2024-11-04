//
// Copyright 2024 DXOS.org
//

import { FormatEnum, type ScalarType } from '@dxos/echo-schema';

/**
 * Format value by type.
 * Used by Table, Sheet, etc.
 */
// TODO(burdon): Move ot react-ui-data.
// TODO(burdon): Formatting is different from kind format (e.g., percent is not a data format).
export const formatValue = (
  type: ScalarType,
  format: FormatEnum,
  value: any,
  locale: string | undefined = undefined,
): string => {
  switch (format) {
    case FormatEnum.Boolean: {
      return (value as boolean).toLocaleString().toUpperCase();
    }

    //
    // Numbers.
    //

    case FormatEnum.Number: {
      return value.toLocaleString(locale);
    }

    // case FormatEnum.Percent: {
    //   return (value as number) * 100 + '%';
    // }

    case FormatEnum.Currency: {
      return (value as number).toLocaleString(locale, {
        style: 'currency',
        currency: 'USD', // TODO(burdon): Get from value.
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    //
    // Dates.
    //

    case FormatEnum.DateTime: {
      const date = new Date(value as number);
      return date.toLocaleString(locale);
    }

    case FormatEnum.Date: {
      const date = new Date(value as number);
      return date.toLocaleDateString(locale);
    }

    case FormatEnum.Time: {
      const date = new Date(value as number);
      return date.toLocaleTimeString(locale);
    }

    default: {
      return String(value);
    }
  }
};
