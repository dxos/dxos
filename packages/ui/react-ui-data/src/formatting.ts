//
// Copyright 2024 DXOS.org
//

import { FieldScalarType } from './types';

/**
 * Format value by type.
 */
// TODO(burdon): Reconcile with FormattingModel.
export const formatValue = (type: FieldScalarType, value: any, locale: string | undefined = undefined): string => {
  switch (type) {
    case FieldScalarType.Boolean: {
      return (value as boolean).toLocaleString().toUpperCase();
    }

    //
    // Numbers.
    //

    case FieldScalarType.Number: {
      return value.toLocaleString(locale);
    }

    case FieldScalarType.Percent: {
      return (value as number) * 100 + '%';
    }

    case FieldScalarType.Currency: {
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

    case FieldScalarType.DateTime: {
      const date = new Date(value as number);
      return date.toLocaleString(locale);
    }

    case FieldScalarType.Date: {
      const date = new Date(value as number);
      return date.toLocaleDateString(locale);
    }

    case FieldScalarType.Time: {
      const date = new Date(value as number);
      return date.toLocaleTimeString(locale);
    }

    default: {
      return String(value);
    }
  }
};
