//
// Copyright 2025 DXOS.org
//

import { BitField, range } from '@dxos/util';

export const createTextBitbar = (value: Uint8Array, length: number, maxBars: number = 20): string => {
  if (!value || !length) {
    return '';
  }

  return range(maxBars)
    .map((i) => {
      const start = Math.floor((i * length) / maxBars);
      let end = Math.ceil(((i + 1) * length) / maxBars);
      if (end === start) {
        end = start + 1;
      }

      const count = BitField.count(value, start, end);
      const percent = count / (end - start);

      // Use different symbols based on density
      if (percent === 1) {
        return '▓'; // Full block for 100%
      } else if (percent > 0.5) {
        return '▒'; // Medium shade block for >50%
      } else if (percent > 0) {
        return '░'; // Light shade block for >0%
      } else {
        return ' '; // Space for 0%
      }
    })
    .join(' ');
};
