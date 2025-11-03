//
// Copyright 2025 DXOS.org
//

import { type ChromaticPalette } from '@dxos/react-ui-types';

export type Hue = ChromaticPalette | 'neutral';

// TODO(burdon): Rename?
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
  text: 'text-neutralFill',
  icon: 'text-neutralSurfaceText',
  bg: 'bg-neutralFill',
  surface: 'bg-neutralSurface',
  border: 'border-neutralFill',
};

// NOTE: Don't include blue/red which are used as system colors.
// NOTE: Cordinated with `tag.css`.
// https://github.com/dxos/dxos/blob/main/packages/ui/react-ui-theme/src/styles/layers/tag.css
export const styles: ColorStyles[] = [
  {
    hue: 'orange',
    text: 'text-orangeFill',
    icon: 'text-orangeSurfaceText',
    bg: 'bg-orangeFill',
    surface: 'bg-orangeSurface',
    border: 'border-orangeFill',
  },
  {
    hue: 'amber',
    text: 'text-amberFill',
    icon: 'text-amberSurfaceText',
    bg: 'bg-amberFill',
    surface: 'bg-amberSurface',
    border: 'border-amberFill',
  },
  {
    hue: 'yellow',
    text: 'text-yellowFill',
    icon: 'text-yellowSurfaceText',
    bg: 'bg-yellowFill',
    surface: 'bg-yellowSurface',
    border: 'border-yellowFill',
  },
  {
    hue: 'lime',
    text: 'text-limeFill',
    icon: 'text-limeSurfaceText',
    bg: 'bg-limeFill',
    surface: 'bg-limeSurface',
    border: 'border-limeFill',
  },
  {
    hue: 'green',
    text: 'text-greenFill',
    icon: 'text-greenSurfaceText',
    bg: 'bg-greenFill',
    surface: 'bg-greenSurface',
    border: 'border-greenFill',
  },
  {
    hue: 'emerald',
    text: 'text-emeraldFill',
    icon: 'text-emeraldSurfaceText',
    bg: 'bg-emeraldFill',
    surface: 'bg-emeraldSurface',
    border: 'border-emeraldFill',
  },
  {
    hue: 'teal',
    text: 'text-tealFill',
    icon: 'text-tealSurfaceText',
    bg: 'bg-tealFill',
    surface: 'bg-tealSurface',
    border: 'border-tealFill',
  },
  {
    hue: 'cyan',
    text: 'text-cyanFill',
    icon: 'text-cyanSurfaceText',
    bg: 'bg-cyanFill',
    surface: 'bg-cyanSurface',
    border: 'border-cyanFill',
  },
  {
    hue: 'sky',
    text: 'text-skyFill',
    icon: 'text-skySurfaceText',
    bg: 'bg-skyFill',
    surface: 'bg-skySurface',
    border: 'border-skyFill',
  },
  {
    hue: 'indigo',
    text: 'text-indigoFill',
    icon: 'text-indigoSurfaceText',
    bg: 'bg-indigoFill',
    surface: 'bg-indigoSurface',
    border: 'border-indigoFill',
  },
  {
    hue: 'violet',
    text: 'text-violetFill',
    icon: 'text-violetSurfaceText',
    bg: 'bg-violetFill',
    surface: 'bg-violetSurface',
    border: 'border-violetFill',
  },
  {
    hue: 'purple',
    text: 'text-purpleFill',
    icon: 'text-purpleSurfaceText',
    bg: 'bg-purpleFill',
    surface: 'bg-purpleSurface',
    border: 'border-purpleFill',
  },
  {
    hue: 'fuchsia',
    text: 'text-fuchsiaFill',
    icon: 'text-fuchsiaSurfaceText',
    bg: 'bg-fuchsiaFill',
    surface: 'bg-fuchsiaSurface',
    border: 'border-fuchsiaFill',
  },
  {
    hue: 'rose',
    text: 'text-roseFill',
    icon: 'text-roseSurfaceText',
    bg: 'bg-roseFill',
    surface: 'bg-roseSurface',
    border: 'border-roseFill',
  },
  {
    hue: 'pink',
    text: 'text-pinkFill',
    icon: 'text-pinkSurfaceText',
    bg: 'bg-pinkFill',
    surface: 'bg-pinkSurface',
    border: 'border-pinkFill',
  },
];

export const getStyles = (hue: string): ColorStyles => styles.find((color) => color.hue === hue) || neutralColor;

export const getHashHue = (id: string | undefined): Hue => (id ? styles[getHash(id) % styles.length].hue : 'neutral');

// TODO(thure): Reconcile with `to-fallback.ts` which exports `toHue` which overlaps a lot.
export const getHashStyles = (id: string | undefined): ColorStyles => {
  const hue = getHashHue(id);
  return getStyles(hue);
};

const getHash = (id: string): number => id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
