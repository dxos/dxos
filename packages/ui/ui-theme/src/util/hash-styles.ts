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
  icon: string; // -surface-text
  text: string; // -text
  border: string; // -border
};

const neutralColor: ColorStyles = {
  hue: 'neutral',
  fill: 'bg-neutral-fill',
  surface: 'bg-neutral-surface',
  icon: 'text-neutral-surface-text',
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
    icon: 'text-red-surface-text',
    text: 'text-red-text',
    border: 'border-red-border',
  },
  {
    hue: 'orange',
    fill: 'bg-orange-fill',
    surface: 'bg-orange-surface',
    icon: 'text-orange-surface-text',
    text: 'text-orange-text',
    border: 'border-orange-border',
  },
  {
    hue: 'amber',
    fill: 'bg-amber-fill',
    surface: 'bg-amber-surface',
    icon: 'text-amber-surface-text',
    text: 'text-amber-text',
    border: 'border-amber-border',
  },
  {
    hue: 'yellow',
    fill: 'bg-yellow-fill',
    surface: 'bg-yellow-surface',
    icon: 'text-yellow-surface-text',
    text: 'text-yellow-text',
    border: 'border-yellow-border',
  },
  {
    hue: 'lime',
    fill: 'bg-lime-fill',
    surface: 'bg-lime-surface',
    icon: 'text-lime-surface-text',
    text: 'text-lime-text',
    border: 'border-lime-border',
  },
  {
    hue: 'green',
    fill: 'bg-green-fill',
    surface: 'bg-green-surface',
    icon: 'text-green-surface-text',
    text: 'text-green-text',
    border: 'border-green-border',
  },
  {
    hue: 'emerald',
    fill: 'bg-emerald-fill',
    surface: 'bg-emerald-surface',
    icon: 'text-emerald-surface-text',
    text: 'text-emerald-text',
    border: 'border-emerald-border',
  },
  {
    hue: 'teal',
    fill: 'bg-teal-fill',
    surface: 'bg-teal-surface',
    icon: 'text-teal-surface-text',
    text: 'text-teal-text',
    border: 'border-teal-border',
  },
  {
    hue: 'cyan',
    fill: 'bg-cyan-fill',
    surface: 'bg-cyan-surface',
    icon: 'text-cyan-surface-text',
    text: 'text-cyan-text',
    border: 'border-cyan-border',
  },
  {
    hue: 'sky',
    fill: 'bg-sky-fill',
    surface: 'bg-sky-surface',
    icon: 'text-sky-surface-text',
    text: 'text-sky-text',
    border: 'border-sky-border',
  },
  {
    hue: 'blue',
    fill: 'bg-blue-fill',
    surface: 'bg-blue-surface',
    icon: 'text-blue-surface-text',
    text: 'text-blue-text',
    border: 'border-blue-border',
  },
  {
    hue: 'indigo',
    fill: 'bg-indigo-fill',
    surface: 'bg-indigo-surface',
    icon: 'text-indigo-surface-text',
    text: 'text-indigo-text',
    border: 'border-indigo-border',
  },
  {
    hue: 'violet',
    fill: 'bg-violet-fill',
    surface: 'bg-violet-surface',
    icon: 'text-violet-surface-text',
    text: 'text-violet-text',
    border: 'border-violet-border',
  },
  {
    hue: 'purple',
    fill: 'bg-purple-fill',
    surface: 'bg-purple-surface',
    icon: 'text-purple-surface-text',
    text: 'text-purple-text',
    border: 'border-purple-border',
  },
  {
    hue: 'fuchsia',
    fill: 'bg-fuchsia-fill',
    surface: 'bg-fuchsia-surface',
    icon: 'text-fuchsia-surface-text',
    text: 'text-fuchsia-text',
    border: 'border-fuchsia-border',
  },
  {
    hue: 'pink',
    fill: 'bg-pink-fill',
    surface: 'bg-pink-surface',
    icon: 'text-pink-surface-text',
    text: 'text-pink-text',
    border: 'border-pink-border',
  },
  {
    hue: 'rose',
    fill: 'bg-rose-fill',
    surface: 'bg-rose-surface',
    icon: 'text-rose-surface-text',
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
