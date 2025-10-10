//
// Copyright 2025 DXOS.org
//

export type Color = {
  hue: string;
  text: string;
  bg: string;
  tag: string;
  border: string;
};

// NOTE: Don't include blue/red which are used as system colors.
// NOTE: Cordinated with `tag.css`.
// https://github.com/dxos/dxos/blob/main/packages/ui/react-ui-theme/src/styles/layers/tag.css
export const colors: Color[] = [
  {
    hue: 'orange',
    bg: 'bg-orangeFill',
    text: 'text-orangeFill',
    tag: 'bg-orangeSurface',
    border: 'border-orangeFill',
  },
  {
    hue: 'amber',
    bg: 'bg-amberFill',
    text: 'text-amberFill',
    tag: 'bg-amberSurface',
    border: 'border-amberFill',
  },
  {
    hue: 'yellow',
    bg: 'bg-yellowFill',
    text: 'text-yellowFill',
    tag: 'bg-yellowSurface',
    border: 'border-yellowFill',
  },
  {
    hue: 'lime',
    bg: 'bg-limeFill',
    text: 'text-limeFill',
    tag: 'bg-limeSurface',
    border: 'border-limeFill',
  },
  {
    hue: 'green',
    bg: 'bg-greenFill',
    text: 'text-greenFill',
    tag: 'bg-greenSurface',
    border: 'border-greenFill',
  },
  {
    hue: 'emerald',
    bg: 'bg-emeraldFill',
    text: 'text-emeraldFill',
    tag: 'bg-emeraldSurface',
    border: 'border-emeraldFill',
  },
  {
    hue: 'teal',
    bg: 'bg-tealFill',
    text: 'text-tealFill',
    tag: 'bg-tealSurface',
    border: 'border-tealFill',
  },
  {
    hue: 'cyan',
    bg: 'bg-cyanFill',
    text: 'text-cyanFill',
    tag: 'bg-cyanSurface',
    border: 'border-cyanFill',
  },
  {
    hue: 'sky',
    bg: 'bg-skyFill',
    text: 'text-skyFill',
    tag: 'bg-skySurface',
    border: 'border-skyFill',
  },
  {
    hue: 'indigo',
    bg: 'bg-indigoFill',
    text: 'text-indigoFill',
    tag: 'bg-indigoSurface',
    border: 'border-indigoFill',
  },
  {
    hue: 'violet',
    bg: 'bg-violetFill',
    text: 'text-violetFill',
    tag: 'bg-violetSurface',
    border: 'border-violetFill',
  },
  {
    hue: 'purple',
    bg: 'bg-purpleFill',
    text: 'text-purpleFill',
    tag: 'bg-purpleSurface',
    border: 'border-purpleFill',
  },
  {
    hue: 'fuchsia',
    bg: 'bg-fuchsiaFill',
    text: 'text-fuchsiaFill',
    tag: 'bg-fuchsiaSurface',
    border: 'border-fuchsiaFill',
  },
  {
    hue: 'rose',
    bg: 'bg-roseFill',
    text: 'text-roseFill',
    tag: 'bg-roseSurface',
    border: 'border-roseFill',
  },
  {
    hue: 'pink',
    bg: 'bg-pinkFill',
    text: 'text-pinkFill',
    tag: 'bg-pinkSurface',
    border: 'border-pinkFill',
  },
];

// TODO(thure): Reconcile with `to-fallback.ts` which exports `toHue` which overlaps a lot.
export const getHashColor = (type: string | undefined): Color => {
  if (!type) {
    return {
      hue: 'neutral',
      bg: 'bg-neutralFill',
      text: 'text-neutralFill',
      tag: 'bg-neutralSurface',
      border: 'border-neutralFill',
    };
  }

  const hash = type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};
