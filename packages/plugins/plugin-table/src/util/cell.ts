//
// Copyright 2024 DXOS.org
//

import { mx } from '@dxos/react-ui-theme';
import { FieldValueType } from '@dxos/schema';

export const classesForFieldType = (type: FieldValueType): string | undefined => {
  switch (type) {
    case FieldValueType.Number:
      return mx('text-right font-mono');
    case FieldValueType.Boolean:
      return mx('font-mono');
    case FieldValueType.String:
    case FieldValueType.Text:
      return;
    case FieldValueType.Timestamp:
    case FieldValueType.DateTime:
    case FieldValueType.Date:
    case FieldValueType.Time:
      return mx('font-mono');
    case FieldValueType.Percent:
      return mx('text-right');
    case FieldValueType.Currency:
      return mx('text-right');
    case FieldValueType.JSON:
      return mx('font-mono');
    default:
      return undefined;
  }
};

export const formatCellValue = (value: any, type: FieldValueType): any => {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case FieldValueType.Number:
    case FieldValueType.Boolean:
    case FieldValueType.String:
    case FieldValueType.Text:
      return value;
    case FieldValueType.Timestamp:
    case FieldValueType.DateTime:
    case FieldValueType.Date:
    case FieldValueType.Time:
      return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
    case FieldValueType.Percent:
      return `${value * 100}%`;
    case FieldValueType.Currency:
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    case FieldValueType.JSON:
      return JSON.stringify(value);
    default:
      return String(value);
  }
};

export const convertCellValue = (value: any, type: FieldValueType): any => {
  switch (type) {
    case FieldValueType.Number:
      return Number(value);
    case FieldValueType.Boolean:
      if (typeof value === 'string') {
        if (value === '0') {
          return false;
        } else if (value === '1') {
          return true;
        } else {
          return value.toLowerCase() === 'true';
        }
      }
      return Boolean(value);
    case FieldValueType.String:
    case FieldValueType.Text:
      return String(value);
    case FieldValueType.Timestamp:
    case FieldValueType.DateTime:
    case FieldValueType.Date:
    case FieldValueType.Time:
      return new Date(value);
    case FieldValueType.Percent:
      return Number(value) / 100;
    case FieldValueType.Currency:
      return Number(value.replace(/[^0-9.-]+/g, ''));
    case FieldValueType.JSON:
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    default:
      return value;
  }
};
