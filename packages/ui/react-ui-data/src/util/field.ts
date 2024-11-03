//
// Copyright 2024 DXOS.org
//

import { FormatEnum } from '@dxos/echo-schema';

import { type ValidationError } from './';

/**
 * Parse value by field value type.
 * Used by Table, Sheet, etc.
 * Handles various data types including booleans, numbers, dates, and strings.
 * Returns undefined for empty or null inputs.
 */
export const parseValue = (type: FormatEnum, value: any) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  switch (type) {
    //
    // Boolean.
    //

    case FormatEnum.Boolean: {
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

    case FormatEnum.Number: {
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    }

    case FormatEnum.Percent: {
      const num = Number(value);
      return Number.isNaN(num) ? null : num / 100;
    }

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

    case FormatEnum.String:
    case FormatEnum.Text: {
      return String(value);
    }

    default: {
      return value;
    }
  }
};

export const cellClassesForFieldType = (type: FormatEnum): string[] | undefined => {
  switch (type) {
    case FormatEnum.Number:
      return ['text-right', 'font-mono'];
    case FormatEnum.Boolean:
      return ['text-right', 'font-mono'];
    case FormatEnum.String:
    case FormatEnum.Text:
      return undefined;
    case FormatEnum.Timestamp:
    case FormatEnum.DateTime:
    case FormatEnum.Date:
    case FormatEnum.Time:
      return ['font-mono'];
    case FormatEnum.Percent:
      return ['text-right'];
    case FormatEnum.Currency:
      return ['text-right'];
    case FormatEnum.JSON:
      return ['font-mono'];
    default:
      return undefined;
  }
};

//
// Type Configs
//

// TODO(ZaymonFC): Should this move to '@dxos/schema' field module? Annotation?
const typeConfigSections = {
  base: ['path', 'label', 'type'] as const,
  numeric: ['digits'] as const,
  ref: ['schema', 'property'] as const,
} as const;

type TypeConfigSection = keyof typeof typeConfigSections;

export const typeFeatures: Partial<Record<FormatEnum, TypeConfigSection[]>> = {
  [FormatEnum.Number]: ['numeric'],
  [FormatEnum.Percent]: ['numeric'],
  [FormatEnum.Currency]: ['numeric'],
  [FormatEnum.Ref]: ['ref'],
} as const;

// TODO(ZaymonFC): How to do this with translations?
export const pathNotUniqueError = (path: string): ValidationError => ({
  path: 'path',
  message: `'${path}' is already present`,
});
