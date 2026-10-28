//
// Copyright 2026 DXOS.org
//

/** DXOS hue names as approximate hex colours, for objects that store a hue rather than a colour. */
export const HUE_COLORS: Readonly<Record<string, string>> = {
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

/** The colour of an object with none. */
export const DEFAULT_OBJECT_COLOR = '#4d4d4d';

/** A hue name or hex string as hex, so colours interpolate (OKLab needs hex) and Babylon can parse them. */
export const resolveHex = (color: string | undefined): string => {
  if (!color) {
    return DEFAULT_OBJECT_COLOR;
  }
  if (color.startsWith('#')) {
    return color;
  }
  return HUE_COLORS[color] ?? DEFAULT_OBJECT_COLOR;
};
