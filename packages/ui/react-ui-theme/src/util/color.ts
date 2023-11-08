//
// Copyright 2023 DXOS.org
//

import { configColors } from '../config';

const hexadecimalPaletteSeries: (keyof typeof configColors)[] = [
  'red' as const,
  'orange' as const,
  'amber' as const,
  // Yellow is hard to make look good.
  // 'yellow' as const,
  'lime' as const,
  'green' as const,
  'emerald' as const,
  'teal' as const,
  'cyan' as const,
  'sky' as const,
  'blue' as const,
  'indigo' as const,
  'violet' as const,
  'purple' as const,
  'fuchsia' as const,
  'pink' as const,
  'rose' as const,
];

const shadeKeys = {
  color: '450' as const,
  highlightDark: '900' as const,
  highlightLight: '50' as const,
};

/**
 * Get a color for a given value.
 *
 * Deterministic based on the value, so the same value will always return the same color.
 * If value is hexadecimal, the last digit is used to determine the color.
 * If value is not hexadecimal, the length of the value is used to determine the color.
 *
 * @param value - Value to get a color for.
 * @param type - Type of color to get, either 'color' or 'highlight'.
 * @param themeMode - Determines whether to use the light or dark shade of the highlight color.
 */
// TODO(wittjosiah): Should this be in another package?
export const getColorForValue = ({
  value,
  type,
  themeMode,
}: {
  value: string;
  type: 'color' | 'highlight';
  themeMode?: 'light' | 'dark';
}): string => {
  let colorDigit: number;
  // Attempt `parseInt` within a `try` in case it isn't hexadecimal.
  try {
    colorDigit = parseInt(value.slice(-1), 16);
  } catch {
    colorDigit = value.length % 16;
  }

  return type === 'color'
    ? configColors[hexadecimalPaletteSeries[colorDigit]][shadeKeys.color]
    : configColors[hexadecimalPaletteSeries[colorDigit]][
        shadeKeys[themeMode === 'dark' ? 'highlightDark' : 'highlightLight']
      ];
};
