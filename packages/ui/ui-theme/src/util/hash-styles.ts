//
// Copyright 2025 DXOS.org
//

import { type ChromaticPalette } from '@dxos/ui-types';

export type Hue = ChromaticPalette | 'neutral';

// TODO(burdon): Reconcile with ui-theme/theme/roles.css
export type ColorStyles = {
  hue: Hue;
  text: string;
  icon: string;
  bg: string;
  surface: string;
  border: string;
};

const neutralColor: ColorStyles = {
  hue: 'neutral',
  text: 'text-neutral-fill',
  icon: 'text-neutral-surface-text',
  bg: 'bg-neutral-fill',
  surface: 'bg-neutral-surface',
  border: 'border-neutral-fill',
};

// NOTE: Don't include blue/red which are used as system colors.
// NOTE: Cordinated with `tag.css`.
// https://github.com/dxos/dxos/blob/main/packages/ui/react-ui-theme/src/styles/layers/tag.css
export const styles: ColorStyles[] = [
  {
    hue: 'orange',
    text: 'text-orange-fill',
    icon: 'text-orange-surface-text',
    bg: 'bg-orange-fill',
    surface: 'bg-orange-surface',
    border: 'border-orange-fill',
  },
  {
    hue: 'amber',
    text: 'text-amber-fill',
    icon: 'text-amber-surface-text',
    bg: 'bg-amber-fill',
    surface: 'bg-amber-surface',
    border: 'border-amber-fill',
  },
  {
    hue: 'yellow',
    text: 'text-yellow-fill',
    icon: 'text-yellow-surface-text',
    bg: 'bg-yellow-fill',
    surface: 'bg-yellow-surface',
    border: 'border-yellow-fill',
  },
  {
    hue: 'lime',
    text: 'text-lime-fill',
    icon: 'text-lime-surface-text',
    bg: 'bg-lime-fill',
    surface: 'bg-lime-surface',
    border: 'border-lime-fill',
  },
  {
    hue: 'green',
    text: 'text-green-fill',
    icon: 'text-green-surface-text',
    bg: 'bg-green-fill',
    surface: 'bg-green-surface',
    border: 'border-green-fill',
  },
  {
    hue: 'emerald',
    text: 'text-emerald-fill',
    icon: 'text-emerald-surface-text',
    bg: 'bg-emerald-fill',
    surface: 'bg-emerald-surface',
    border: 'border-emerald-fill',
  },
  {
    hue: 'teal',
    text: 'text-teal-fill',
    icon: 'text-teal-surface-text',
    bg: 'bg-teal-fill',
    surface: 'bg-teal-surface',
    border: 'border-teal-fill',
  },
  {
    hue: 'cyan',
    text: 'text-cyan-fill',
    icon: 'text-cyan-surface-text',
    bg: 'bg-cyan-fill',
    surface: 'bg-cyan-surface',
    border: 'border-cyan-fill',
  },
  {
    hue: 'sky',
    text: 'text-sky-fill',
    icon: 'text-sky-surface-text',
    bg: 'bg-sky-fill',
    surface: 'bg-sky-surface',
    border: 'border-sky-fill',
  },
  {
    hue: 'indigo',
    text: 'text-indigo-fill',
    icon: 'text-indigo-surface-text',
    bg: 'bg-indigo-fill',
    surface: 'bg-indigo-surface',
    border: 'border-indigo-fill',
  },
  {
    hue: 'violet',
    text: 'text-violet-fill',
    icon: 'text-violet-surface-text',
    bg: 'bg-violet-fill',
    surface: 'bg-violet-surface',
    border: 'border-violet-fill',
  },
  {
    hue: 'purple',
    text: 'text-purple-fill',
    icon: 'text-purple-surface-text',
    bg: 'bg-purple-fill',
    surface: 'bg-purple-surface',
    border: 'border-purple-fill',
  },
  {
    hue: 'fuchsia',
    text: 'text-fuchsia-fill',
    icon: 'text-fuchsia-surface-text',
    bg: 'bg-fuchsia-fill',
    surface: 'bg-fuchsia-surface',
    border: 'border-fuchsia-fill',
  },
  {
    hue: 'rose',
    text: 'text-rose-fill',
    icon: 'text-rose-surface-text',
    bg: 'bg-rose-fill',
    surface: 'bg-rose-surface',
    border: 'border-rose-fill',
  },
  {
    hue: 'pink',
    text: 'text-pink-fill',
    icon: 'text-pink-surface-text',
    bg: 'bg-pink-fill',
    surface: 'bg-pink-surface',
    border: 'border-pink-fill',
  },
];

// TODO(burdon): Rename getClassNames.
export const getStyles = (hue: string): ColorStyles => {
  return styles.find((color) => color.hue === hue) || neutralColor;
};

export const getHashHue = (id: string | undefined): Hue => {
  return id ? styles[getHash(id) % styles.length].hue : 'neutral';
};

// TODO(thure): Reconcile with `to-fallback.ts` which exports `toHue` which overlaps a lot.
export const getHashStyles = (id: string | undefined): ColorStyles => {
  return getStyles(getHashHue(id));
};

const getHash = (id: string): number => id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
