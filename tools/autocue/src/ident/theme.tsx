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
  /** A Tailwind colour name for the logo, e.g. `sky-400`, `white`; defaults to the theme's main colour. */
  logoColor?: string;
};

export type Palette = {
  ground: string;
  main: string;
  second: string;
  muted: string;
  accent: string;
  logo: string;
};

const PALETTES: Record<IdentTheme, Omit<Palette, 'logo'>> = {
  dark: { ...COLORS, muted: '#B8B8B8' },
  // Off-black on off-white: pure black on pure white reads harsher than the dark cards do.
  light: {
    ground: colors.neutral[50],
    main: colors.neutral[900],
    second: colors.neutral[800],
    muted: colors.neutral[500],
    accent: COLORS.accent,
  },
};

/** A Tailwind colour by name (`sky-400`, `white`); throws on a name the palette lacks, so a typo fails the render. */
export const tailwindColor = (name: string): string => {
  const flat = (colors as Record<string, unknown>)[name];
  if (typeof flat === 'string') {
    return flat;
  }
  const split = name.lastIndexOf('-');
  const scale = (colors as Record<string, unknown>)[name.slice(0, split)];
  const value =
    split > 0 && scale && typeof scale === 'object'
      ? (scale as Record<string, unknown>)[name.slice(split + 1)]
      : undefined;
  if (typeof value !== 'string') {
    throw new Error(`unknown Tailwind colour: ${name}`);
  }
  return value;
};

/** Every Tailwind colour `tailwindColor` accepts: `white`, `black`, and each `<hue>-<shade>`. */
export const TAILWIND_COLOR_NAMES: string[] = Object.entries(colors).flatMap(([hue, value]) =>
  typeof value === 'string'
    ? ['white', 'black'].includes(hue)
      ? [hue]
      : []
    : Object.keys(value).map((shade) => `${hue}-${shade}`),
);

export const palette = ({ theme = 'dark', logoColor }: IdentProps = {}): Palette => {
  const base = PALETTES[theme];
  if (!logoColor) {
    return { ...base, logo: base.main };
  }
  // The end card's rule is the logo's accent, so a coloured logo takes it along.
  const logo = tailwindColor(logoColor);
  return { ...base, logo, accent: logo };
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
