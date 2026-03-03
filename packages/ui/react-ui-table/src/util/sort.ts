//
// Copyright 2025 DXOS.org
//

import { Format, type QueryAST } from '@dxos/echo';

/**
 * Gets a normalized sort value for a given value and format.
 * This ensures consistent sorting behavior across different data types.
 */
export const getSortValue = (value: any, format: Format.TypeFormat): any => {
  // Handle null/undefined
  if (value === undefined || value === null) {
    return null;
  }

  // Handle dates chronologically if schema indicates date format
  const isDateFormat = format === Format.TypeFormat.DateTime || format === Format.TypeFormat.Date;
  if (isDateFormat) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
    // Fallback to string if date parsing fails
    return String(value);
  }

  // Handle numbers if schema indicates number format
  if (
    format === Format.TypeFormat.Number ||
    format === Format.TypeFormat.Integer ||
    format === Format.TypeFormat.Currency ||
    format === Format.TypeFormat.Percent ||
    format === Format.TypeFormat.Duration
  ) {
    const num = typeof value === 'number' ? value : Number(value);
    if (!isNaN(num)) {
      return num;
    }
    // Fallback to string if number parsing fails
    return String(value);
  }

  // Default to string comparison
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value;
  }

  // Fallback to string representation
  return String(value);
};

/**
 * Compares two values for sorting based on the field format.
 * Handles dates, numbers, and strings appropriately.
 */
export const compareValues = (
  aValue: any,
  bValue: any,
  format: Format.TypeFormat,
  direction: QueryAST.OrderDirection,
): number => {
  // Handle null/undefined values - nulls sort to the end
  if (aValue === undefined || aValue === null) {
    return bValue === undefined || bValue === null ? 0 : 1;
  }
  if (bValue === undefined || bValue === null) {
    return -1;
  }

  // Get normalized sort values
  const aSortValue = getSortValue(aValue, format);
  const bSortValue = getSortValue(bValue, format);

  // Compare based on type
  let comparison = 0;
  if (typeof aSortValue === 'number' && typeof bSortValue === 'number') {
    comparison = aSortValue - bSortValue;
  } else if (typeof aSortValue === 'string' && typeof bSortValue === 'string') {
    comparison = aSortValue.localeCompare(bSortValue);
  } else {
    // Mixed types - convert both to strings
    comparison = String(aSortValue).localeCompare(String(bSortValue));
  }

  return direction === 'desc' ? -comparison : comparison;
};
