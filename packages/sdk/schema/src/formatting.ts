//
// Copyright 2024 DXOS.org
//

import { FormatEnum } from '@dxos/echo-schema';

/**
 * Format value by type.
 * Used by Table, Sheet, etc.
 */
// TODO(burdon): Kind vs type.
// TODO(burdon): Reconcile with FormattingModel.
// TODO(burdon): Handle parsing also.
export const formatValue = (type: FormatEnum, value: any, locale: string | undefined = undefined): string => {
  switch (type) {
    case FormatEnum.Boolean: {
      return (value as boolean).toLocaleString().toUpperCase();
    }

    //
    // Numbers.
    //

    case FormatEnum.Number: {
      return value.toLocaleString(locale);
    }

    case FormatEnum.Percent: {
      return (value as number) * 100 + '%';
    }

    case FormatEnum.Currency: {
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
