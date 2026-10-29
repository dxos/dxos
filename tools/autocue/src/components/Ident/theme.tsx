//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType, createContext, useContext } from 'react';
import colors from 'tailwindcss/colors';

import { COLORS } from './brand.ts';

export type IdentTheme = 'dark' | 'light';

/** The props every ident composition takes, from `render.mjs --theme / --logo-color` or a `Player`'s `inputProps`. */
export type IdentProps = {
  theme?: IdentTheme;
  /** A Tailwind hue for the logo (`sky`), shaded `-500` in dark and `-600` in light; defaults to the theme's main. */
  logoColor?: string;
};

export type Palette = {
  theme: IdentTheme;
  /** Whether `logoColor` chose the logo's colour, rather than the theme's main. */
  tinted: boolean;
  /** The void around a letterboxed card, matching the Frame's `--autocue-letterbox`. */
  letterbox: string;
  ground: string;
  main: string;
  second: string;
  muted: string;
  accent: string;
  logo: string;
};

const PALETTES: Record<IdentTheme, Omit<Palette, 'theme' | 'tinted' | 'logo'>> = {
  dark: { ...COLORS, muted: '#B8B8B8', letterbox: '#000' },
  // Off-black on off-white: pure black on pure white reads harsher than the dark cards do.
  light: {
    letterbox: colors.neutral[400],
    ground: colors.neutral[50],
    main: colors.neutral[900],
    second: colors.neutral[800],
    muted: colors.neutral[500],
    accent: COLORS.accent,
  },
};

/** The one shade a logo hue takes in each theme: light on the dark ground, darker on the light one for contrast. */
const HUE_SHADE = { dark: '500', light: '600' } as const;

/** Tailwind's hues (`sky`, `rose`, ...), each a scale of shades. */
const SCALES = new Map(
  Object.entries(colors).flatMap(([hue, value]) => (typeof value === 'object' ? [[hue, value] as const] : [])),
);

export const TAILWIND_HUES: string[] = [...SCALES.keys()];

export const palette = ({ theme = 'dark', logoColor }: IdentProps = {}): Palette => {
  const base = PALETTES[theme];
  if (!logoColor) {
    return { ...base, theme, tinted: false, logo: base.main };
  }
  const scale = SCALES.get(logoColor);
  // Thrown rather than ignored, so a misspelt hue fails the render instead of drawing the default.
  if (!scale) {
    throw new Error(`unknown Tailwind hue: ${logoColor} (expected one of ${TAILWIND_HUES.join(', ')})`);
  }
  // The end card's rule is the logo's accent, so a coloured logo takes it along.
  const logo = scale[HUE_SHADE[theme]];
  return { ...base, theme, tinted: true, logo, accent: logo };
};

const PaletteContext = createContext<Palette>(palette());

/** The palette of the composition being drawn. */
export const usePalette = () => useContext(PaletteContext);

/** Makes a composition take `IdentProps` and hand its palette to everything it draws. */
export const withIdent = <P extends object>(Component: ComponentType<P>) => {
  const WithIdent = (props: P & IdentProps) => (
    <PaletteContext.Provider value={palette(props)}>
      <Component {...props} />
    </PaletteContext.Provider>
  );
  WithIdent.displayName = `withIdent(${Component.displayName ?? Component.name})`;
  return WithIdent;
};
