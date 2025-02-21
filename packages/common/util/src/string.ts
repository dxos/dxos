//
// Copyright 2025 DXOS.org
//

/**
 * Capitalizes the first letter of a string.
 */
export const capitalize = (str: string): string => {
  if (str.length === 0) {
    return '';
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
};
