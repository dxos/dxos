//
// Copyright 2024 DXOS.org
//

import { FieldKindEnum } from '@dxos/schema';

import { type ValidationError } from './';

/**
 * Parse value by field value type.
 * Used by Table, Sheet, etc.
 * Handles various data types including booleans, numbers, dates, and strings.
 * Returns undefined for empty or null inputs.
 */
export const parseValue = (type: FieldKindEnum, value: any) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  switch (type) {
    //
    // Boolean.
    //

    case FieldKindEnum.Boolean: {
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

    case FieldKindEnum.Number: {
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    }

    case FieldKindEnum.Percent: {
      const num = Number(value);
      return Number.isNaN(num) ? null : num / 100;
    }

    case FieldKindEnum.Currency: {
      if (typeof value !== 'string') {
        return null;
      }
      const num = Number(value.replace(/[^0-9.-]+/g, ''));
      return Number.isNaN(num) ? null : num;
    }

    //
    // Dates.
    //

    case FieldKindEnum.DateTime:
    case FieldKindEnum.Date:
    case FieldKindEnum.Time:
    case FieldKindEnum.Timestamp: {
      const date = new Date(value as string | number);
      return isNaN(date.getTime()) ? null : date;
    }

    //
    // Strings.
    //

    case FieldKindEnum.String:
    case FieldKindEnum.Text: {
      return String(value);
    }

    default: {
      return value;
    }
  }
};

export const cellClassesForFieldType = (type: FieldKindEnum): string[] | undefined => {
  switch (type) {
    case FieldKindEnum.Number:
      return ['text-right', 'font-mono'];
    case FieldKindEnum.Boolean:
      return ['text-right', 'font-mono'];
    case FieldKindEnum.String:
    case FieldKindEnum.Text:
      return undefined;
    case FieldKindEnum.Timestamp:
    case FieldKindEnum.DateTime:
    case FieldKindEnum.Date:
    case FieldKindEnum.Time:
      return ['font-mono'];
    case FieldKindEnum.Percent:
      return ['text-right'];
    case FieldKindEnum.Currency:
      return ['text-right'];
    case FieldKindEnum.JSON:
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

export const typeFeatures: Partial<Record<FieldKindEnum, TypeConfigSection[]>> = {
  [FieldKindEnum.Number]: ['numeric'],
  [FieldKindEnum.Percent]: ['numeric'],
  [FieldKindEnum.Currency]: ['numeric'],
  [FieldKindEnum.Ref]: ['ref'],
} as const;

// TODO(ZaymonFC): How to do this with translations?
export const pathNotUniqueError = (path: string): ValidationError => ({
  path: 'path',
  message: `'${path}' is already present`,
});
