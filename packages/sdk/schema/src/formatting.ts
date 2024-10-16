//
// Copyright 2024 DXOS.org
//

import { FieldValueType } from './types';

export const parseValue = (type: FieldValueType, value: any) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  switch (type) {
    //
    // Boolean.
    //

    case FieldValueType.Boolean: {
      if (typeof value === 'string') {
        const lowercaseValue = value.toLowerCase();
        if (lowercaseValue === '0' || lowercaseValue === 'false') {
          return false;
        } else if (lowercaseValue === '1' || lowercaseValue === 'true') {
          return true;
        }
      }
      return Boolean(value);
    }

    //
    // Numbers.
    //

    case FieldValueType.Number: {
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    }

    case FieldValueType.Percent: {
      const num = Number(value);
      return Number.isNaN(num) ? null : num / 100;
    }

    case FieldValueType.Currency: {
      if (typeof value !== 'string') {
        return null;
      }
      const num = Number(value.replace(/[^0-9.-]+/g, ''));
      return Number.isNaN(num) ? null : num;
    }

    //
    // Dates.
    //

    case FieldValueType.DateTime:
    case FieldValueType.Date:
    case FieldValueType.Time:
    case FieldValueType.Timestamp: {
      const date = new Date(value as string | number);
      return isNaN(date.getTime()) ? null : date;
    }

    //
    // Strings.
    //

    case FieldValueType.String:
    case FieldValueType.Text: {
      return String(value);
    }

    default: {
      return value;
    }
  }
};

/**
 * Format value by type.
 * Used by Table, Sheet, etc.
 */
// TODO(burdon): Reconcile with FormattingModel.
// TODO(burdon): Handle parsing also.
export const formatValue = (type: FieldValueType, value: any, locale: string | undefined = undefined): string => {
  switch (type) {
    case FieldValueType.Boolean: {
      return (value as boolean).toLocaleString().toUpperCase();
    }

    //
    // Numbers.
    //

    case FieldValueType.Number: {
      return value.toLocaleString(locale);
    }

    case FieldValueType.Percent: {
      return (value as number) * 100 + '%';
    }

    case FieldValueType.Currency: {
      return (value as number).toLocaleString(locale, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    //
    // Dates.
    //

    case FieldValueType.DateTime: {
      const date = new Date(value as number);
      return date.toLocaleString(locale);
    }

    case FieldValueType.Date: {
      const date = new Date(value as number);
      return date.toLocaleDateString(locale);
    }

    case FieldValueType.Time: {
      const date = new Date(value as number);
      return date.toLocaleTimeString(locale);
    }

    default: {
      return String(value);
    }
  }
};
