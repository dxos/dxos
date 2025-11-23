//
// Copyright 2024 DXOS.org
//

import { Format, GeoLocation, TypeEnum } from '@dxos/echo/internal';
import { type ValidationError } from '@dxos/schema';

/**
 * Parse value by field value type.
 * Used by Table, Sheet, etc.
 * Handles various data types including booleans, numbers, dates, and strings.
 * Returns undefined for empty or null inputs.
 */
export type ParseProps = {
  type?: TypeEnum;
  format?: TypeFormat;
  value: any;
};

export const parseValue = ({ type, format, value }: ParseProps) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parseScalar = (type?: TypeEnum) => {
    switch (type) {
      case TypeEnum.Boolean: {
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

      case TypeEnum.Number: {
        const cleaned = typeof value === 'string' ? value.replace(/[^0-9.-]+/g, '') : value;
        const num = Number(cleaned);
        return Number.isNaN(num) ? null : num;
      }

      case TypeEnum.String:
      case TypeEnum.Ref:
        return String(value);

      default: {
        return value;
      }
    }
  };

  if (!format) {
    return parseScalar(type);
  }

  switch (format) {
    case Format.TypeFormat.Boolean:
      return parseScalar(TypeEnum.Boolean);

    case Format.TypeFormat.Number:
    case Format.TypeFormat.Percent:
    case Format.TypeFormat.Currency:
      return parseScalar(TypeEnum.Number);

    case Format.TypeFormat.String:
    case Format.TypeFormat.Markdown: {
      return parseScalar(TypeEnum.String);
    }

    case Format.TypeFormat.TypeFormat.Ref:
      throw new Error(`unexpected format: ${Format.TypeFormat.Ref}`);

    case Format.TypeFormat.DateTime:
    case Format.TypeFormat.Date:
    case Format.TypeFormat.Time:
    case Format.TypeFormat.Timestamp: {
      const date = new Date(value as string | number);
      return isNaN(date.getTime()) ? null : date;
    }

    case Format.TypeFormat.TypeFormat.GeoPoint: {
      // Parse string in format "lat,long" to GeoPoint [longitude, latitude].
      if (typeof value === 'string') {
        // Only keep digits, decimal points, minus signs, and commas.
        const cleaned = value.replace(/[^0-9.,-]+/g, '');
        const parts = cleaned.split(',');
        if (parts.length === 2) {
          const lat = parseFloat(parts[0]);
          const long = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(long)) {
            return GeoLocation.toGeoPoint({ latitude: lat, longitude: long });
          }
        }
      }

      return [0, 0];
    }

    default: {
      return value;
    }
  }
};

// TODO(burdon): Type and format.
export type CellClassesForFieldTypeProps = {
  type?: TypeEnum;
  format?: TypeFormat;
};

export const cellClassesForFieldType = ({ type, format }: CellClassesForFieldTypeProps): string[] | undefined => {
  switch (format || type) {
    case Format.TypeFormat.Markdown:
      return undefined;
    case Format.TypeFormat.Time:
    case Format.TypeFormat.Timestamp:
    case Format.TypeFormat.DateTime:
    case Format.TypeFormat.Date:
    case Format.TypeFormat.Duration:
      return ['font-mono', 'text-right'];
    case Format.TypeFormat.Currency:
      return ['text-right'];
    case Format.TypeFormat.JSON:
    case Format.TypeFormat.DID:
      return ['font-mono'];
    case TypeEnum.Number:
    case TypeEnum.Boolean:
      return ['text-right', 'font-mono'];
    case TypeEnum.String:
      return undefined;
    case TypeEnum.Ref:
      return undefined;
    default:
      return undefined;
  }
};

// TODO(ZaymonFC): How to do this with translations?
export const pathNotUniqueError = (path: string): ValidationError => ({
  path: 'path',
  message: `'${path}' is already present`,
});
