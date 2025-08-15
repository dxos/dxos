//
// Copyright 2025 DXOS.org
//

export type Color = {
  color: string;
  text: string;
  bg: string;
  tag: string;
};

// NOTE: Don't include blue/red which are used as system colors.
export const colors: Color[] = [
  { color: 'orange', bg: 'bg-orangeFill', text: 'text-orangeFill', tag: 'bg-orangeSurface' },
  { color: 'amber', bg: 'bg-amberFill', text: 'text-amberFill', tag: 'bg-amberSurface' },
  { color: 'yellow', bg: 'bg-yellowFill', text: 'text-yellowFill', tag: 'bg-yellowSurface' },
  { color: 'lime', bg: 'bg-limeFill', text: 'text-limeFill', tag: 'bg-limeSurface' },
  { color: 'green', bg: 'bg-greenFill', text: 'text-greenFill', tag: 'bg-greenSurface' },
  { color: 'emerald', bg: 'bg-emeraldFill', text: 'text-emeraldFill', tag: 'bg-emeraldSurface' },
  { color: 'teal', bg: 'bg-tealFill', text: 'text-tealFill', tag: 'bg-tealSurface' },
  { color: 'cyan', bg: 'bg-cyanFill', text: 'text-cyanFill', tag: 'bg-cyanSurface' },
  { color: 'sky', bg: 'bg-skyFill', text: 'text-skyFill', tag: 'bg-skySurface' },
  { color: 'indigo', bg: 'bg-indigoFill', text: 'text-indigoFill', tag: 'bg-indigoSurface' },
  { color: 'violet', bg: 'bg-violetFill', text: 'text-violetFill', tag: 'bg-violetSurface' },
  { color: 'purple', bg: 'bg-purpleFill', text: 'text-purpleFill', tag: 'bg-purpleSurface' },
  { color: 'fuchsia', bg: 'bg-fuchsiaFill', text: 'text-fuchsiaFill', tag: 'bg-fuchsiaSurface' },
  { color: 'rose', bg: 'bg-roseFill', text: 'text-roseFill', tag: 'bg-roseSurface' },
  { color: 'pink', bg: 'bg-pinkFill', text: 'text-pinkFill', tag: 'bg-pinkSurface' },
];

// TODO(thure): Reconcile with `to-fallback.ts` which exports `toHue` which overlaps a lot.
export const getHashColor = (type: string | undefined): Color => {
  if (!type) {
    return { color: 'neutral', bg: 'bg-neutralFill', text: 'text-neutralFill', tag: 'bg-neutralSurface' };
  }

  const hash = type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};
