//
// Copyright 2026 DXOS.org
//

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * Format a byte count using binary units.
 */
export const formatBytes = (bytes: number): string => {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }

  return `${unit === 0 ? value : value.toFixed(1)} ${BYTE_UNITS[unit]}`;
};
