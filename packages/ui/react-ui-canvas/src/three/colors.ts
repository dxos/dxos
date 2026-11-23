//
// Copyright 2026 DXOS.org
//

/** DXOS hue names as approximate hex colours, for 3D materials (copied from plugin-spacetime, retired in stage 3). */
export const HUE_COLORS: Readonly<Record<string, string>> = {
  neutral: '#8a8f99',
  red: '#cc3333',
  orange: '#e6801a',
  amber: '#e6b31a',
  yellow: '#e6cc1a',
  lime: '#80cc1a',
  green: '#33b333',
  emerald: '#33b380',
  teal: '#1ab3b3',
  cyan: '#1ab3e6',
  sky: '#3399e6',
  blue: '#3366cc',
  indigo: '#4d4dcc',
  violet: '#804dcc',
  purple: '#9933cc',
  fuchsia: '#cc33b3',
  pink: '#e64d80',
  rose: '#e64d66',
};

export const DEFAULT_COLOR = '#8a8f99';

/** A hue name or hex string as hex, which Babylon parses. */
export const resolveHex = (color: string | undefined): string =>
  !color ? DEFAULT_COLOR : color.startsWith('#') ? color : (HUE_COLORS[color] ?? DEFAULT_COLOR);
