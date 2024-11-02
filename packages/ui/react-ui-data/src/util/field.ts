//
// Copyright 2024 DXOS.org
//

import { FieldFormatEnum } from '@dxos/schema';

import { type ValidationError } from './';

/**
 * Parse value by field value type.
 * Used by Table, Sheet, etc.
 * Handles various data types including booleans, numbers, dates, and strings.
 * Returns undefined for empty or null inputs.
 */
export const parseValue = (type: FieldFormatEnum, value: any) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  switch (type) {
    //
    // Boolean.
    //

    case FieldFormatEnum.Boolean: {
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

    case FieldFormatEnum.Number: {
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    }

    case FieldFormatEnum.Percent: {
      const num = Number(value);
      return Number.isNaN(num) ? null : num / 100;
    }

    case FieldFormatEnum.Currency: {
      if (typeof value !== 'string') {
        return null;
      }
      const num = Number(value.replace(/[^0-9.-]+/g, ''));
      return Number.isNaN(num) ? null : num;
    }

    //
    // Dates.
    //

    case FieldFormatEnum.DateTime:
    case FieldFormatEnum.Date:
    case FieldFormatEnum.Time:
    case FieldFormatEnum.Timestamp: {
      const date = new Date(value as string | number);
      return isNaN(date.getTime()) ? null : date;
    }

    //
    // Strings.
    //

    case FieldFormatEnum.String:
    case FieldFormatEnum.Text: {
      return String(value);
    }

    default: {
      return value;
    }
  }
};

export const cellClassesForFieldType = (type: FieldFormatEnum): string[] | undefined => {
  switch (type) {
    case FieldFormatEnum.Number:
      return ['text-right', 'font-mono'];
    case FieldFormatEnum.Boolean:
      return ['text-right', 'font-mono'];
    case FieldFormatEnum.String:
    case FieldFormatEnum.Text:
      return undefined;
    case FieldFormatEnum.Timestamp:
    case FieldFormatEnum.DateTime:
    case FieldFormatEnum.Date:
    case FieldFormatEnum.Time:
      return ['font-mono'];
    case FieldFormatEnum.Percent:
      return ['text-right'];
    case FieldFormatEnum.Currency:
      return ['text-right'];
    case FieldFormatEnum.JSON:
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

export const typeFeatures: Partial<Record<FieldFormatEnum, TypeConfigSection[]>> = {
  [FieldFormatEnum.Number]: ['numeric'],
  [FieldFormatEnum.Percent]: ['numeric'],
  [FieldFormatEnum.Currency]: ['numeric'],
  [FieldFormatEnum.Ref]: ['ref'],
} as const;

// TODO(ZaymonFC): How to do this with translations?
export const pathNotUniqueError = (path: string): ValidationError => ({
  path: 'path',
  message: `'${path}' is already present`,
});
