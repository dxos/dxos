//
// Copyright 2024 DXOS.org
//

import { FormatEnum, ScalarEnum } from '@dxos/echo-schema';
import { type ValidationError } from '@dxos/schema';

/**
 * Parse value by field value type.
 * Used by Table, Sheet, etc.
 * Handles various data types including booleans, numbers, dates, and strings.
 * Returns undefined for empty or null inputs.
 */
// TODO(burdon): Differentiate between data FormatEnum and display format (e.g., percent).
export type ParseProps = {
  type?: ScalarEnum;
  format?: FormatEnum;
  value: any;
};

export const parseValue = ({ type, format, value }: ParseProps) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (!format) {
    switch (type) {
      case ScalarEnum.Boolean: {
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

      case ScalarEnum.Number: {
        const num = Number(value);
        return Number.isNaN(num) ? null : num;
      }

      case ScalarEnum.String:
      case ScalarEnum.Ref:
        return String(value);

      default: {
        return value;
      }
    }
  }

  switch (format) {
    // TODO(burdon): Percent is not part of the data format; it's just a diplay format.
    // case FormatEnum.Percent: {
    //   const num = Number(value);
    //   return Number.isNaN(num) ? null : num / 100;
    // }

    case FormatEnum.Currency: {
      if (typeof value !== 'string') {
        return null;
      }
      const num = Number(value.replace(/[^0-9.-]+/g, ''));
      return Number.isNaN(num) ? null : num;
    }

    //
    // Dates.
    //

    case FormatEnum.DateTime:
    case FormatEnum.Date:
    case FormatEnum.Time:
    case FormatEnum.Timestamp: {
      const date = new Date(value as string | number);
      return isNaN(date.getTime()) ? null : date;
    }

    //
    // Strings.
    //

    case FormatEnum.Markdown: {
      return String(value);
    }

    default: {
      return value;
    }
  }
};

// TODO(burdon): Type and format.
export type CellClassesForFieldTypeProps = {
  type?: ScalarEnum;
  format?: FormatEnum;
};

export const cellClassesForFieldType = ({ type, format }: CellClassesForFieldTypeProps): string[] | undefined => {
  if (!format) {
    switch (type) {
      case ScalarEnum.Number:
        return ['text-right', 'font-mono'];
      case ScalarEnum.Boolean:
        return ['text-right', 'font-mono'];
      case ScalarEnum.String:
        return undefined;
      case ScalarEnum.Ref:
        return undefined;

      default: {
        return undefined;
      }
    }
  }

  switch (format) {
    case FormatEnum.Markdown:
      return undefined;
    case FormatEnum.Timestamp:
    case FormatEnum.DateTime:
    case FormatEnum.Date:
    case FormatEnum.Time:
      return ['font-mono'];
    case FormatEnum.Currency:
      return ['text-right'];
    case FormatEnum.JSON:
      return ['font-mono'];
    default:
      return undefined;
  }
};

// TODO(ZaymonFC): How to do this with translations?
export const pathNotUniqueError = (path: string): ValidationError => ({
  path: 'path',
  message: `'${path}' is already present`,
});
