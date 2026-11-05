//
// Copyright 2026 DXOS.org
//

/**
 * Brand neutrals and accents, and the Paper and Graphite grounds, from the DXOS brand book.
 * Blue and purple are one step off the brand values, since those miss 4.5:1 as text.
 */
export const THEMES = {
  light: {
    bg: '#ffffff',
    surface: '#f4f6f7',
    surfaceStrong: '#e6e9eb',
    fg: '#020202',
    muted: '#5c5f66',
    hairline: '#e6e9eb',
    hairlineStrong: '#c9cdd1',
    accent: '#1f5fe8',
    onAccent: '#ffffff',
    mark: '#96254f',
    code: { keyword: '#7a1f99', string: '#0d6e47', constant: '#8a5f00', type: '#1d4fc4', fn: '#0a6877' },
  },
  dark: {
    bg: '#1d1f20',
    surface: '#26292b',
    surfaceStrong: '#33373a',
    fg: '#ffffff',
    muted: '#9aa0a6',
    hairline: '#33373a',
    hairlineStrong: '#4a4f53',
    accent: '#06c5fd',
    onAccent: '#020202',
    mark: '#ffffff',
    code: { keyword: '#e06bff', string: '#1fd58a', constant: '#f2c14e', type: '#06c5fd', fn: '#1fbfd5' },
  },
};
