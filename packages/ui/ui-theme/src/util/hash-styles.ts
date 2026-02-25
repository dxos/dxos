//
// Copyright 2025 DXOS.org
//

import { type ChromaticPalette } from '@dxos/ui-types';

export type Hue = ChromaticPalette | 'neutral';

// TODO(burdon): Reconcile with ui-theme/theme/roles.css
export type ColorStyles = {
  hue: Hue;
  text: string; // -text
  icon: string; // -surface-text
  bg: string; // -fill
  surface: string; // -surface
  border: string; // -border
};

const neutralColor: ColorStyles = {
  hue: 'neutral',
  text: 'text-neutral-text',
  icon: 'text-neutral-surface-text',
  bg: 'bg-neutral-fill',
  surface: 'bg-neutral-surface',
  border: 'border-neutral-border',
};

// NOTE: Don't include blue/red which are used as system colors.
// NOTE: Cordinated with `tag.css`.
// https://github.com/dxos/dxos/blob/main/packages/ui/react-ui-theme/src/styles/layers/tag.css
export const styles: ColorStyles[] = [
  {
    hue: 'orange',
    text: 'text-orange-text',
    icon: 'text-orange-surface-text',
    bg: 'bg-orange-fill',
    surface: 'bg-orange-surface',
    border: 'border-orange-border',
  },
  {
    hue: 'amber',
    text: 'text-amber-text',
    icon: 'text-amber-surface-text',
    bg: 'bg-amber-fill',
    surface: 'bg-amber-surface',
    border: 'border-amber-border',
  },
  {
    hue: 'yellow',
    text: 'text-yellow-text',
    icon: 'text-yellow-surface-text',
    bg: 'bg-yellow-fill',
    surface: 'bg-yellow-surface',
    border: 'border-yellow-border',
  },
  {
    hue: 'lime',
    text: 'text-lime-text',
    icon: 'text-lime-surface-text',
    bg: 'bg-lime-fill',
    surface: 'bg-lime-surface',
    border: 'border-lime-border',
  },
  {
    hue: 'green',
    text: 'text-green-text',
    icon: 'text-green-surface-text',
    bg: 'bg-green-fill',
    surface: 'bg-green-surface',
    border: 'border-green-border',
  },
  {
    hue: 'emerald',
    text: 'text-emerald-text',
    icon: 'text-emerald-surface-text',
    bg: 'bg-emerald-fill',
    surface: 'bg-emerald-surface',
    border: 'border-emerald-border',
  },
  {
    hue: 'teal',
    text: 'text-teal-text',
    icon: 'text-teal-surface-text',
    bg: 'bg-teal-fill',
    surface: 'bg-teal-surface',
    border: 'border-teal-border',
  },
  {
    hue: 'cyan',
    text: 'text-cyan-text',
    icon: 'text-cyan-surface-text',
    bg: 'bg-cyan-fill',
    surface: 'bg-cyan-surface',
    border: 'border-cyan-border',
  },
  {
    hue: 'sky',
    text: 'text-sky-text',
    icon: 'text-sky-surface-text',
    bg: 'bg-sky-fill',
    surface: 'bg-sky-surface',
    border: 'border-sky-border',
  },
  {
    hue: 'indigo',
    text: 'text-indigo-text',
    icon: 'text-indigo-surface-text',
    bg: 'bg-indigo-fill',
    surface: 'bg-indigo-surface',
    border: 'border-indigo-border',
  },
  {
    hue: 'violet',
    text: 'text-violet-text',
    icon: 'text-violet-surface-text',
    bg: 'bg-violet-fill',
    surface: 'bg-violet-surface',
    border: 'border-violet-border',
  },
  {
    hue: 'purple',
    text: 'text-purple-text',
    icon: 'text-purple-surface-text',
    bg: 'bg-purple-fill',
    surface: 'bg-purple-surface',
    border: 'border-purple-border',
  },
  {
    hue: 'fuchsia',
    text: 'text-fuchsia-text',
    icon: 'text-fuchsia-surface-text',
    bg: 'bg-fuchsia-fill',
    surface: 'bg-fuchsia-surface',
    border: 'border-fuchsia-border',
  },
  {
    hue: 'rose',
    text: 'text-rose-text',
    icon: 'text-rose-surface-text',
    bg: 'bg-rose-fill',
    surface: 'bg-rose-surface',
    border: 'border-rose-border',
  },
  {
    hue: 'pink',
    text: 'text-pink-text',
    icon: 'text-pink-surface-text',
    bg: 'bg-pink-fill',
    surface: 'bg-pink-surface',
    border: 'border-pink-border',
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
