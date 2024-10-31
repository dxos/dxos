//
// Copyright 2024 DXOS.org
//

import { FieldValueType } from './types';

/**
 * Format value by type.
 * Used by Table, Sheet, etc.
 */
// TODO(burdon): Kind vs type.
// TODO(burdon): Reconcile with FormattingModel.
// TODO(burdon): Handle parsing also.
export const formatValue = (type: FieldValueType, value: any, locale: string | undefined = undefined): string => {
  switch (type) {
    // case FieldValueType.Boolean: {
    //   return (value as boolean).toLocaleString().toUpperCase();
    // }

    //
    // Numbers.
    //

    // case FieldValueType.Number: {
    //   return value.toLocaleString(locale);
    // }

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
