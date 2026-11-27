//
// Copyright 2026 DXOS.org
//

import { type ThemeSlots, resolveColor } from '@dxos/scene';

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

const hexPair = (channel: number): string =>
  Math.round(Math.min(255, Math.max(0, channel)))
    .toString(16)
    .padStart(2, '0');

/** An `rgb()` channel: a number of 255, or a percentage of it. */
const rgbChannel = (value: string): number =>
  value.endsWith('%') ? (Number.parseFloat(value) * 255) / 100 : Number(value);

/**
 * A literal CSS colour as the `#rrggbb` Babylon parses: a hex of any length (its alpha dropped, since a material's is
 * its opacity) or `rgb()`; none for a notation it does not read.
 */
export const literalHex = (css: string): string | undefined => {
  const hex = /^#([0-9a-f]{3,8})$/i.exec(css)?.[1];
  if (hex) {
    return hex.length === 3 || hex.length === 4
      ? `#${[...hex.slice(0, 3)].map((digit) => digit + digit).join('')}`
      : hex.length === 6 || hex.length === 8
        ? `#${hex.slice(0, 6)}`
        : undefined;
  }
  const channels = /^rgba?\((.+)\)$/i
    .exec(css)?.[1]
    .split(/[\s,/]+/)
    .filter(Boolean);
  if (channels && channels.length >= 3) {
    const [red, green, blue] = channels.map(rgbChannel);
    return [red, green, blue].every(Number.isFinite) ? `#${hexPair(red)}${hexPair(green)}${hexPair(blue)}` : undefined;
  }
  return undefined;
};

/**
 * A colour as hex, which Babylon parses: a name the theme resolves to one of its hues (whatever its tone, which a
 * material does not draw), or a literal as written.
 */
export const resolveHex = (color: string | undefined, theme?: ThemeSlots): string => {
  const value = resolveColor(color, theme);
  return (
    (value?.kind === 'css' ? literalHex(value.css) : value?.kind === 'name' ? HUE_COLORS[value.name] : undefined) ??
    DEFAULT_COLOR
  );
};
