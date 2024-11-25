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
// TODO(burdon): Move to react-ui-form.
// TODO(burdon): Formatting is different from kind format (e.g., percent is not a data format).
export const formatForDisplay = ({ type, format, value, locale = undefined }: ValueFormatProps): string => {
  const formatScalar = (type: TypeEnum) => {
    switch (type) {
      case TypeEnum.Boolean:
        return (value as boolean).toLocaleString().toUpperCase();
      case TypeEnum.Number:
        return value.toLocaleString(locale);
      case TypeEnum.String:
      case TypeEnum.Ref:
        return String(value);

      default: {
        return String(value);
      }
    }
  };

  if (!format) {
    return formatScalar(type);
  }

  switch (format) {
    case FormatEnum.Boolean: {
      return formatScalar(TypeEnum.Boolean);
    }
    case FormatEnum.Number: {
      return formatScalar(TypeEnum.Number);
    }
    case FormatEnum.String:
    case FormatEnum.Ref: {
      return formatScalar(TypeEnum.String);
    }
    case FormatEnum.Percent: {
      return `${(value as number) * 100}%`;
    }
    case FormatEnum.Currency: {
      // TODO(burdon): Get from property annotation.
      return (value as number).toLocaleString(locale, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    case FormatEnum.DateTime:
    case FormatEnum.Date:
    case FormatEnum.Time: {
      const date = new Date(value as number);
      if (format === FormatEnum.DateTime) {
        return date.toLocaleString(locale);
      } else if (format === FormatEnum.Date) {
        return date.toLocaleDateString(locale);
      } else {
        return date.toLocaleTimeString(locale);
      }
    }
    default: {
      if (value === null || value === 'undefined') {
        return '';
      }
      return String(value);
    }
  }
};

export const formatForEditing = ({ type, format, value, locale = undefined }: ValueFormatProps): string => {
  const formatScalar = (type: TypeEnum) => {
    switch (type) {
      case TypeEnum.Boolean:
      case TypeEnum.Number:
      case TypeEnum.String:
      case TypeEnum.Ref:
        return String(value);

      default:
        return String(value);
    }
  };

  if (!format) {
    return formatScalar(type);
  }

  switch (format) {
    case FormatEnum.Boolean:
    case FormatEnum.Number:
    case FormatEnum.String:
    case FormatEnum.Ref: {
      return formatScalar(type);
    }
    case FormatEnum.Percent: {
      return String(value * 100);
    }
    case FormatEnum.Currency: {
      return String(value);
    }
    case FormatEnum.DateTime: {
      const date = new Date(value as number);
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
