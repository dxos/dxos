//
// Copyright 2024 DXOS.org
//

import { FormatEnum, ScalarEnum } from '@dxos/echo-schema';

type ValueFormatProps = {
  type: ScalarEnum;
  format?: FormatEnum | undefined;
  value: any;
  locale?: string | undefined;
};

/**
 * Format value by type.
 * Used by Table, Sheet, etc.
 */
// TODO(burdon): Move to react-ui-data.
// TODO(burdon): Formatting is different from kind format (e.g., percent is not a data format).
export const formatValue = ({ type, format, value, locale = undefined }: ValueFormatProps): string => {
  if (!format) {
    switch (type) {
      case ScalarEnum.Boolean: {
        return (value as boolean).toLocaleString().toUpperCase();
      }
      case ScalarEnum.Number: {
        return value.toLocaleString(locale);
      }

      case ScalarEnum.String: {
        return String(value);
      }

      // TODO(ZaymonFC): Will we ever have a ref that doesn't have a format?
      case ScalarEnum.Ref: {
        return String(value);
      }

      default: {
        return String(value);
      }
    }
  }

  switch (format) {
    //
    // Numbers.
    //

    case FormatEnum.Percent: {
      return (value as number) * 100 + '%';
    }

    case FormatEnum.Currency: {
      return (value as number).toLocaleString(locale, {
        style: 'currency',
        currency: 'USD', // TODO(burdon): Get from property annotation.
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
