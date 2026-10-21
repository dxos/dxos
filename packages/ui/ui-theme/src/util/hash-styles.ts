//
// Copyright 2025 DXOS.org
//

import { type ChromaticPalette } from '@dxos/ui-types';

export type Hue = ChromaticPalette | 'neutral';

/**
 * See theme.css
 */
export type ColorStyles = {
  hue: Hue;
  bg: string;
  surface: string;
  fg: string;
  text: string;
  border: string;
};

const neutral: ColorStyles = {
  hue: 'neutral',
  bg: 'bg-neutral-bg',
  surface: 'bg-neutral-surface',
  fg: 'text-neutral-fg',
  text: 'text-neutral-text',
  border: 'border-neutral-border',
};

// NOTE: Coordinated with `tag.css`.
// https://github.com/dxos/dxos/blob/main/packages/ui/react-ui-theme/src/styles/layers/tag.css
const styles: ColorStyles[] = [
  {
    hue: 'red',
    bg: 'bg-red-bg',
    surface: 'bg-red-surface',
    fg: 'text-red-fg',
    text: 'text-red-text',
    border: 'border-red-border',
  },
  {
    hue: 'orange',
    bg: 'bg-orange-bg',
    surface: 'bg-orange-surface',
    fg: 'text-orange-fg',
    text: 'text-orange-text',
    border: 'border-orange-border',
  },
  {
    hue: 'amber',
    bg: 'bg-amber-bg',
    surface: 'bg-amber-surface',
    fg: 'text-amber-fg',
    text: 'text-amber-text',
    border: 'border-amber-border',
  },
  {
    hue: 'yellow',
    bg: 'bg-yellow-bg',
    surface: 'bg-yellow-surface',
    fg: 'text-yellow-fg',
    text: 'text-yellow-text',
    border: 'border-yellow-border',
  },
  {
    hue: 'lime',
    bg: 'bg-lime-bg',
    surface: 'bg-lime-surface',
    fg: 'text-lime-fg',
    text: 'text-lime-text',
    border: 'border-lime-border',
  },
  {
    hue: 'green',
    bg: 'bg-green-bg',
    surface: 'bg-green-surface',
    fg: 'text-green-fg',
    text: 'text-green-text',
    border: 'border-green-border',
  },
  {
    hue: 'emerald',
    bg: 'bg-emerald-bg',
    surface: 'bg-emerald-surface',
    fg: 'text-emerald-fg',
    text: 'text-emerald-text',
    border: 'border-emerald-border',
  },
  {
    hue: 'teal',
    bg: 'bg-teal-bg',
    surface: 'bg-teal-surface',
    fg: 'text-teal-fg',
    text: 'text-teal-text',
    border: 'border-teal-border',
  },
  {
    hue: 'cyan',
    bg: 'bg-cyan-bg',
    surface: 'bg-cyan-surface',
    fg: 'text-cyan-fg',
    text: 'text-cyan-text',
    border: 'border-cyan-border',
  },
  {
    hue: 'sky',
    bg: 'bg-sky-bg',
    surface: 'bg-sky-surface',
    fg: 'text-sky-fg',
    text: 'text-sky-text',
    border: 'border-sky-border',
  },
  {
    hue: 'blue',
    bg: 'bg-blue-bg',
    surface: 'bg-blue-surface',
    fg: 'text-blue-fg',
    text: 'text-blue-text',
    border: 'border-blue-border',
  },
  {
    hue: 'indigo',
    bg: 'bg-indigo-bg',
    surface: 'bg-indigo-surface',
    fg: 'text-indigo-fg',
    text: 'text-indigo-text',
    border: 'border-indigo-border',
  },
  {
    hue: 'violet',
    bg: 'bg-violet-bg',
    surface: 'bg-violet-surface',
    fg: 'text-violet-fg',
    text: 'text-violet-text',
    border: 'border-violet-border',
  },
  {
    hue: 'purple',
    bg: 'bg-purple-bg',
    surface: 'bg-purple-surface',
    fg: 'text-purple-fg',
    text: 'text-purple-text',
    border: 'border-purple-border',
  },
  {
    hue: 'fuchsia',
    bg: 'bg-fuchsia-bg',
    surface: 'bg-fuchsia-surface',
    fg: 'text-fuchsia-fg',
    text: 'text-fuchsia-text',
    border: 'border-fuchsia-border',
  },
  {
    hue: 'pink',
    bg: 'bg-pink-bg',
    surface: 'bg-pink-surface',
    fg: 'text-pink-fg',
    text: 'text-pink-text',
    border: 'border-pink-border',
  },
  {
    hue: 'rose',
    bg: 'bg-rose-bg',
    surface: 'bg-rose-surface',
    fg: 'text-rose-fg',
    text: 'text-rose-text',
    border: 'border-rose-border',
  },
];

export const palette = {
  neutral,
  hues: styles,
};

const validHues: ReadonlySet<Hue> = new Set<Hue>([neutral.hue, ...styles.map((s) => s.hue)]);

/**
 * Normalise an arbitrary string into a known `Hue`, falling back to `'neutral'` when the
 * input doesn't match one of the catalogued palette entries. Useful when accepting hue
 * values from user-authored data (e.g. ECHO objects, plugin settings) that need to be
 * forwarded to a hue-keyed prop like `Tag`'s `palette`.
 */
export const toHue = (hue: string | undefined): Hue => (hue && validHues.has(hue as Hue) ? (hue as Hue) : 'neutral');

// TODO(burdon): Rename getClassNames.
export const getStyles = (hue: string): ColorStyles => {
  return styles.find((color) => color.hue === hue) || neutral;
};

// TODO(thure): Reconcile with `to-fallback.ts` which exports `toHue` which overlaps a lot.
export const getHashStyles = (id: string | undefined): ColorStyles => {
  return getStyles(getHashHue(id));
};

export const getHashHue = (id: string | undefined): Hue => {
  return id ? styles[getHash(id) % styles.length].hue : 'neutral';
};

const getHash = (id: string): number => id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
