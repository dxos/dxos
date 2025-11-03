//
// Copyright 2024 DXOS.org
//

/**
 * Date string in YYYY-MM-DD format (based on current timezone).
 */
export const getDateString = (date = new Date()) =>
  date.getFullYear() +
  '-' +
  String(date.getMonth() + 1).padStart(2, '0') +
  '-' +
  String(date.getDate()).padStart(2, '0');

/**
 * Parse date string in YYYY-MM-DD format (based on current timezone).
 */
export const parseDateString = (str: string) => {
  const date = new Date(str);
  return new Date(date.getTime() + date.getTimezoneOffset() * 60_000);
};
