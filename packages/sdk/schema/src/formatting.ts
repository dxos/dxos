//
// Copyright 2024 DXOS.org
//

import { FormatEnum, TypeEnum } from '@dxos/echo-schema';

type ValueFormatProps = {
  type: TypeEnum;
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
export const formatForDisplay = ({ type, format, value, locale = undefined }: ValueFormatProps): string => {
  if (!format) {
    switch (type) {
      case TypeEnum.Boolean: {
        return (value as boolean).toLocaleString().toUpperCase();
      }
      case TypeEnum.Number: {
        return value.toLocaleString(locale);
      }

      case TypeEnum.String: {
        return String(value);
      }

      // TODO(ZaymonFC): Will we ever have a ref that doesn't have a format?
      case TypeEnum.Ref: {
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
      if (value === null || value === 'undefined') {
        return '';
      } else {
        return String(value);
      }
    }
  }
};

export const formatForEditing = ({ type, format, value, locale = undefined }: ValueFormatProps): string => {
  if (!format) {
    switch (type) {
      case TypeEnum.Boolean:
      case TypeEnum.Number:
      case TypeEnum.String:
      case TypeEnum.Ref:
      default:
        return String(value);
    }
  }

  switch (format) {
    case FormatEnum.Percent: {
      return String(value * 100); // Just the number without '%'.
    }
    case FormatEnum.Currency: {
      return String(value); // Just the number without currency formatting.
    }
    case FormatEnum.DateTime: {
      const date = new Date(value as number);
      // Could consider ISO string or specific format based on requirements.
      return date.toISOString();
    }
    case FormatEnum.Date: {
      const date = new Date(value as number);
      return date.toISOString().split('T')[0];
    }
    case FormatEnum.Time: {
      const date = new Date(value as number);
      return date.toISOString().split('T')[1].split('.')[0];
    }
    default: {
      return String(value);
    }
  }
};
