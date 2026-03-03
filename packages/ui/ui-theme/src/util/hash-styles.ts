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
  surfaceText: string; // -surface-text
  text: string; // -text
  border: string; // -border
};

const neutralColor: ColorStyles = {
  hue: 'neutral',
  fill: 'bg-neutral-fill',
  surface: 'bg-neutral-surface',
  surfaceText: 'text-neutral-surface-text',
  text: 'text-neutral-text',
  border: 'border-neutral-border',
};

// NOTE: Cordinated with `tag.css`.
// https://github.com/dxos/dxos/blob/main/packages/ui/react-ui-theme/src/styles/layers/tag.css
export const styles: ColorStyles[] = [
  {
    hue: 'red',
    fill: 'bg-red-fill',
    surface: 'bg-red-surface',
    surfaceText: 'text-red-surface-text',
    text: 'text-red-text',
    border: 'border-red-border',
  },
  {
    hue: 'orange',
    fill: 'bg-orange-fill',
    surface: 'bg-orange-surface',
    surfaceText: 'text-orange-surface-text',
    text: 'text-orange-text',
    border: 'border-orange-border',
  },
  {
    hue: 'amber',
    fill: 'bg-amber-fill',
    surface: 'bg-amber-surface',
    surfaceText: 'text-amber-surface-text',
    text: 'text-amber-text',
    border: 'border-amber-border',
  },
  {
    hue: 'yellow',
    fill: 'bg-yellow-fill',
    surface: 'bg-yellow-surface',
    surfaceText: 'text-yellow-surface-text',
    text: 'text-yellow-text',
    border: 'border-yellow-border',
  },
  {
    hue: 'lime',
    fill: 'bg-lime-fill',
    surface: 'bg-lime-surface',
    surfaceText: 'text-lime-surface-text',
    text: 'text-lime-text',
    border: 'border-lime-border',
  },
  {
    hue: 'green',
    fill: 'bg-green-fill',
    surface: 'bg-green-surface',
    surfaceText: 'text-green-surface-text',
    text: 'text-green-text',
    border: 'border-green-border',
  },
  {
    hue: 'emerald',
    fill: 'bg-emerald-fill',
    surface: 'bg-emerald-surface',
    surfaceText: 'text-emerald-surface-text',
    text: 'text-emerald-text',
    border: 'border-emerald-border',
  },
  {
    hue: 'teal',
    fill: 'bg-teal-fill',
    surface: 'bg-teal-surface',
    surfaceText: 'text-teal-surface-text',
    text: 'text-teal-text',
    border: 'border-teal-border',
  },
  {
    hue: 'cyan',
    fill: 'bg-cyan-fill',
    surface: 'bg-cyan-surface',
    surfaceText: 'text-cyan-surface-text',
    text: 'text-cyan-text',
    border: 'border-cyan-border',
  },
  {
    hue: 'sky',
    fill: 'bg-sky-fill',
    surface: 'bg-sky-surface',
    surfaceText: 'text-sky-surface-text',
    text: 'text-sky-text',
    border: 'border-sky-border',
  },
  {
    hue: 'blue',
    fill: 'bg-blue-fill',
    surface: 'bg-blue-surface',
    surfaceText: 'text-blue-surface-text',
    text: 'text-blue-text',
    border: 'border-blue-border',
  },
  {
    hue: 'indigo',
    fill: 'bg-indigo-fill',
    surface: 'bg-indigo-surface',
    surfaceText: 'text-indigo-surface-text',
    text: 'text-indigo-text',
    border: 'border-indigo-border',
  },
  {
    hue: 'violet',
    fill: 'bg-violet-fill',
    surface: 'bg-violet-surface',
    surfaceText: 'text-violet-surface-text',
    text: 'text-violet-text',
    border: 'border-violet-border',
  },
  {
    hue: 'purple',
    fill: 'bg-purple-fill',
    surface: 'bg-purple-surface',
    surfaceText: 'text-purple-surface-text',
    text: 'text-purple-text',
    border: 'border-purple-border',
  },
  {
    hue: 'fuchsia',
    fill: 'bg-fuchsia-fill',
    surface: 'bg-fuchsia-surface',
    surfaceText: 'text-fuchsia-surface-text',
    text: 'text-fuchsia-text',
    border: 'border-fuchsia-border',
  },
  {
    hue: 'pink',
    fill: 'bg-pink-fill',
    surface: 'bg-pink-surface',
    surfaceText: 'text-pink-surface-text',
    text: 'text-pink-text',
    border: 'border-pink-border',
  },
  {
    hue: 'rose',
    fill: 'bg-rose-fill',
    surface: 'bg-rose-surface',
    surfaceText: 'text-rose-surface-text',
    text: 'text-rose-text',
    border: 'border-rose-border',
  },
];

// TODO(burdon): Rename getClassNames.
export const getStyles = (hue: string): ColorStyles => {
  return styles.find((color) => color.hue === hue) || neutralColor;
};

// TODO(thure): Reconcile with `to-fallback.ts` which exports `toHue` which overlaps a lot.
export const getHashStyles = (id: string | undefined): ColorStyles => {
  return getStyles(getHashHue(id));
};

export const getHashHue = (id: string | undefined): Hue => {
  return id ? styles[getHash(id) % styles.length].hue : 'neutral';
};

const getHash = (id: string): number => id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
