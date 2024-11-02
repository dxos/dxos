//
// Copyright 2024 DXOS.org
//

import { FieldFormatEnum } from './types';

/**
 * Format value by type.
 * Used by Table, Sheet, etc.
 */
// TODO(burdon): Kind vs type.
// TODO(burdon): Reconcile with FormattingModel.
// TODO(burdon): Handle parsing also.
export const formatValue = (type: FieldFormatEnum, value: any, locale: string | undefined = undefined): string => {
  switch (type) {
    case FieldFormatEnum.Boolean: {
      return (value as boolean).toLocaleString().toUpperCase();
    }

    //
    // Numbers.
    //

    case FieldFormatEnum.Number: {
      return value.toLocaleString(locale);
    }

    case FieldFormatEnum.Percent: {
      return (value as number) * 100 + '%';
    }

    case FieldFormatEnum.Currency: {
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

    case FieldFormatEnum.DateTime: {
      const date = new Date(value as number);
      return date.toLocaleString(locale);
    }

    case FieldFormatEnum.Date: {
      const date = new Date(value as number);
      return date.toLocaleDateString(locale);
    }

    case FieldFormatEnum.Time: {
      const date = new Date(value as number);
      return date.toLocaleTimeString(locale);
    }

    default: {
      return String(value);
    }
  }
};
