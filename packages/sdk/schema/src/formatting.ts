//
// Copyright 2024 DXOS.org
//

import { FieldKindEnum } from './types';

/**
 * Format value by type.
 * Used by Table, Sheet, etc.
 */
// TODO(burdon): Kind vs type.
// TODO(burdon): Reconcile with FormattingModel.
// TODO(burdon): Handle parsing also.
export const formatValue = (type: FieldKindEnum, value: any, locale: string | undefined = undefined): string => {
  switch (type) {
    case FieldKindEnum.Boolean: {
      return (value as boolean).toLocaleString().toUpperCase();
    }

    //
    // Numbers.
    //

    case FieldKindEnum.Number: {
      return value.toLocaleString(locale);
    }

    case FieldKindEnum.Percent: {
      return (value as number) * 100 + '%';
    }

    case FieldKindEnum.Currency: {
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

    case FieldKindEnum.DateTime: {
      const date = new Date(value as number);
      return date.toLocaleString(locale);
    }

    case FieldKindEnum.Date: {
      const date = new Date(value as number);
      return date.toLocaleDateString(locale);
    }

    case FieldKindEnum.Time: {
      const date = new Date(value as number);
      return date.toLocaleTimeString(locale);
    }

    default: {
      return String(value);
    }
  }
};
