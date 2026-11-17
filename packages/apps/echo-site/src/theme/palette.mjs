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
    code: {
      keyword: '#96254f',
      string: '#1d4fc4',
      constant: '#1d4fc4',
      type: '#6b2fb3',
      fn: '#6b2fb3',
      property: '#a34606',
    },
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
    code: {
      keyword: '#ff7b8a',
      string: '#7cc4ff',
      constant: '#7cc4ff',
      type: '#c4a1ff',
      fn: '#c4a1ff',
      property: '#ffab70',
    },
  },
};
