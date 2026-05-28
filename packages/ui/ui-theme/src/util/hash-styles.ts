//
// Copyright 2025 DXOS.org
//

import { type ChromaticPalette } from '@dxos/ui-types';

export type Hue = ChromaticPalette | 'neutral';

// TODO(burdon): Reconcile with ui-theme/theme/roles.css
export type ColorStyles = {
  hue: Hue;
  fill: string; // -fill
  surface: string; // -surface
  foreground: string; // -foreground
  text: string; // -text
  border: string; // -border
};

const neutral: ColorStyles = {
  hue: 'neutral',
  fill: 'bg-neutral-fill',
  surface: 'bg-neutral-surface',
  foreground: 'text-neutral-foreground',
  text: 'text-neutral-text',
  border: 'border-neutral-border',
};

// NOTE: Coordinated with `tag.css`.
// https://github.com/dxos/dxos/blob/main/packages/ui/react-ui-theme/src/styles/layers/tag.css
const styles: ColorStyles[] = [
  {
    hue: 'red',
    fill: 'bg-red-fill',
    surface: 'bg-red-surface',
    foreground: 'text-red-foreground',
    text: 'text-red-text',
    border: 'border-red-border',
  },
  {
    hue: 'orange',
    fill: 'bg-orange-fill',
    surface: 'bg-orange-surface',
    foreground: 'text-orange-foreground',
    text: 'text-orange-text',
    border: 'border-orange-border',
  },
  {
    hue: 'amber',
    fill: 'bg-amber-fill',
    surface: 'bg-amber-surface',
    foreground: 'text-amber-foreground',
    text: 'text-amber-text',
    border: 'border-amber-border',
  },
  {
    hue: 'yellow',
    fill: 'bg-yellow-fill',
    surface: 'bg-yellow-surface',
    foreground: 'text-yellow-foreground',
    text: 'text-yellow-text',
    border: 'border-yellow-border',
  },
  {
    hue: 'lime',
    fill: 'bg-lime-fill',
    surface: 'bg-lime-surface',
    foreground: 'text-lime-foreground',
    text: 'text-lime-text',
    border: 'border-lime-border',
  },
  {
    hue: 'green',
    fill: 'bg-green-fill',
    surface: 'bg-green-surface',
    foreground: 'text-green-foreground',
    text: 'text-green-text',
    border: 'border-green-border',
  },
  {
    hue: 'emerald',
    fill: 'bg-emerald-fill',
    surface: 'bg-emerald-surface',
    foreground: 'text-emerald-foreground',
    text: 'text-emerald-text',
    border: 'border-emerald-border',
  },
  {
    hue: 'teal',
    fill: 'bg-teal-fill',
    surface: 'bg-teal-surface',
    foreground: 'text-teal-foreground',
    text: 'text-teal-text',
    border: 'border-teal-border',
  },
  {
    hue: 'cyan',
    fill: 'bg-cyan-fill',
    surface: 'bg-cyan-surface',
    foreground: 'text-cyan-foreground',
    text: 'text-cyan-text',
    border: 'border-cyan-border',
  },
  {
    hue: 'sky',
    fill: 'bg-sky-fill',
    surface: 'bg-sky-surface',
    foreground: 'text-sky-foreground',
    text: 'text-sky-text',
    border: 'border-sky-border',
  },
  {
    hue: 'blue',
    fill: 'bg-blue-fill',
    surface: 'bg-blue-surface',
    foreground: 'text-blue-foreground',
    text: 'text-blue-text',
    border: 'border-blue-border',
  },
  {
    hue: 'indigo',
    fill: 'bg-indigo-fill',
    surface: 'bg-indigo-surface',
    foreground: 'text-indigo-foreground',
    text: 'text-indigo-text',
    border: 'border-indigo-border',
  },
  {
    hue: 'violet',
    fill: 'bg-violet-fill',
    surface: 'bg-violet-surface',
    foreground: 'text-violet-foreground',
    text: 'text-violet-text',
    border: 'border-violet-border',
  },
  {
    hue: 'purple',
    fill: 'bg-purple-fill',
    surface: 'bg-purple-surface',
    foreground: 'text-purple-foreground',
    text: 'text-purple-text',
    border: 'border-purple-border',
  },
  {
    hue: 'fuchsia',
    fill: 'bg-fuchsia-fill',
    surface: 'bg-fuchsia-surface',
    foreground: 'text-fuchsia-foreground',
    text: 'text-fuchsia-text',
    border: 'border-fuchsia-border',
  },
  {
    hue: 'pink',
    fill: 'bg-pink-fill',
    surface: 'bg-pink-surface',
    foreground: 'text-pink-foreground',
    text: 'text-pink-text',
    border: 'border-pink-border',
  },
  {
    hue: 'rose',
    fill: 'bg-rose-fill',
    surface: 'bg-rose-surface',
    foreground: 'text-rose-foreground',
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
