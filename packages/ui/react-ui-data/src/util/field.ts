//
// Copyright 2024 DXOS.org
//

import { FieldValueType } from '@dxos/schema';

/**
 * Parse value by field value type.
 * Used by Table, Sheet, etc.
 * Handles various data types including booleans, numbers, dates, and strings.
 * Returns undefined for empty or null inputs.
 */
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

export const cellClassesForFieldType = (type: FieldValueType): string[] | undefined => {
  switch (type) {
    case FieldValueType.Number:
      return ['text-right', 'font-mono'];
    case FieldValueType.Boolean:
      return ['text-right', 'font-mono'];
    case FieldValueType.String:
    case FieldValueType.Text:
      return undefined;
    case FieldValueType.Timestamp:
    case FieldValueType.DateTime:
    case FieldValueType.Date:
    case FieldValueType.Time:
      return ['font-mono'];
    case FieldValueType.Percent:
      return ['text-right'];
    case FieldValueType.Currency:
      return ['text-right'];
    case FieldValueType.JSON:
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

export const typeFeatures: Partial<Record<FieldValueType, TypeConfigSection[]>> = {
  [FieldValueType.Number]: ['numeric'],
  [FieldValueType.Percent]: ['numeric'],
  [FieldValueType.Currency]: ['numeric'],
  [FieldValueType.Ref]: ['ref'],
} as const;
