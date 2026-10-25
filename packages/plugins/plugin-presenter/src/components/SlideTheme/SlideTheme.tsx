//
// Copyright 2026 DXOS.org
//

import React, {
  type CSSProperties,
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import { log } from '@dxos/log';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { SlideTheme } from '#types';

/** Inline style carrying a theme's `--slide-*` variables. */
export type SlideThemeStyle = CSSProperties & { [key: `--slide-${string}`]: string };

type ThemeDefinition = {
  /** Forces the app tokens (which use `light-dark()`) into one mode; unset follows the app. */
  colorScheme?: 'light' | 'dark';
  vars: {
    background: string;
    foreground: string;
    accent: string;
    code: string;
    separator: string;
    fontBody: string;
    fontHeading: string;
    fontMono: string;
  };
};

const BASE: ThemeDefinition['vars'] = {
  background: 'var(--dx-surface-base)',
  foreground: 'var(--color-fg)',
  accent: 'var(--color-accent-text)',
  code: 'var(--color-input-surface)',
  separator: 'var(--color-separator)',
  fontBody: 'var(--font-mono)',
  fontHeading: 'var(--font-mono)',
  fontMono: 'var(--font-mono)',
};

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, ui-serif, serif";

type FontDefinition = {
  family: string;
  /** Loads the web font's faces; absent for fonts the app bundles (ui-theme) and system fonts. */
  load?: () => Promise<unknown>;
};

// Web fonts are imported on first use, so a deck pays only for the fonts it picks; composer-app's `ON_DEMAND_FONTS`
// keeps them out of the PWA precache, so add new ones there too.
const FONTS: Record<SlideTheme.Font, FontDefinition> = {
  'mono': { family: 'var(--font-mono)' },
  'sans': {
    family: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
    load: () => import('@fontsource-variable/inter/index.css'),
  },
  'rounded': {
    family: "'Nunito Variable', ui-rounded, ui-sans-serif, sans-serif",
    load: () => import('@fontsource-variable/nunito/index.css'),
  },
  'serif': {
    family: `'Source Serif 4 Variable', ${SERIF}`,
    load: () => import('@fontsource-variable/source-serif-4/index.css'),
  },
  'display': { family: "'Poiret One', ui-sans-serif, sans-serif" },
  'space-grotesk': {
    family: "'Space Grotesk Variable', ui-sans-serif, sans-serif",
    load: () => import('@fontsource-variable/space-grotesk/index.css'),
  },
  'mali': { family: "'Mali', ui-rounded, ui-sans-serif, sans-serif", load: () => import('@fontsource/mali/index.css') },
  'geist': {
    family: "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
    load: () => import('@fontsource-variable/geist/index.css'),
  },
  'orbitron': {
    family: "'Orbitron Variable', ui-sans-serif, sans-serif",
    load: () => import('@fontsource-variable/orbitron/index.css'),
  },
  'unbounded': {
    family: "'Unbounded Variable', ui-sans-serif, sans-serif",
    load: () => import('@fontsource-variable/unbounded/index.css'),
  },
  'opendyslexic': {
    family: "'OpenDyslexic', ui-sans-serif, sans-serif",
    load: () => import('@fontsource/opendyslexic/index.css'),
  },
  // Covers Chinese as well as Latin in one 8.4 MB file (no per-script subsets); the package's default weight is 300.
  'lxgw-wenkai': {
    family: "'LXGW WenKai', ui-serif, serif",
    load: () => import('@fontsource/lxgw-wenkai/index.css'),
  },
};

const MONO_FONTS: Record<SlideTheme.MonoFont, FontDefinition> = {
  jetbrains: { family: 'var(--font-mono)' },
  fira: {
    family: "'Fira Code Variable', ui-monospace, monospace",
    load: () => import('@fontsource-variable/fira-code/index.css'),
  },
  plex: {
    family: "'IBM Plex Mono', ui-monospace, monospace",
    load: () => import('@fontsource/ibm-plex-mono/index.css'),
  },
  system: { family: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" },
};

const fontsOf = (settings: SlideTheme.Settings) => ({
  font: SlideTheme.isFont(settings.font) ? FONTS[settings.font] : undefined,
  monoFont: SlideTheme.isMonoFont(settings.monoFont) ? MONO_FONTS[settings.monoFont] : undefined,
});

const THEMES: Record<SlideTheme.Name, ThemeDefinition> = {
  default: { vars: BASE },
  light: { colorScheme: 'light', vars: BASE },
  dark: { colorScheme: 'dark', vars: BASE },
  serif: { vars: { ...BASE, fontBody: SERIF, fontHeading: SERIF } },
};

/**
 * The style for a theme with its overrides applied; invalid override values are ignored.
 */
export const slideThemeStyle = (settings: SlideTheme.Settings = {}): SlideThemeStyle => {
  const { colorScheme, vars } = THEMES[SlideTheme.isName(settings.base) ? settings.base : 'default'];
  const pick = (value: string | undefined, valid: (value: unknown) => value is string, fallback: string) =>
    valid(value) ? value : fallback;
  // Stored settings are not re-validated on read, so an unknown name falls back to the theme's own font.
  const { font, monoFont } = fontsOf(settings);
  return {
    colorScheme,
    '--slide-bg': pick(settings.background, SlideTheme.isColor, vars.background),
    '--slide-fg': pick(settings.foreground, SlideTheme.isColor, vars.foreground),
    '--slide-accent': pick(settings.accent, SlideTheme.isColor, vars.accent),
    '--slide-code': vars.code,
    '--slide-separator': vars.separator,
    '--slide-font-body': font?.family ?? vars.fontBody,
    '--slide-font-heading': font?.family ?? vars.fontHeading,
    '--slide-font-mono': monoFont?.family ?? vars.fontMono,
  };
};

/** Classes that paint a slide from its theme variables. */
export const slideThemeClasses = 'bg-(--slide-bg) text-(color:--slide-fg) font-(family-name:--slide-font-body)';

const SlideThemeContext = createContext<SlideTheme.Settings>({});

export type SlideThemeProviderProps = PropsWithChildren<{ settings?: SlideTheme.Settings }>;

/**
 * Sets the theme of every slide rendered below it.
 */
export const SlideThemeProvider = ({ settings = {}, children }: SlideThemeProviderProps) => {
  const { font, monoFont } = fontsOf(settings);
  // Until a web font's faces load the slide shows its fallback list, then swaps; a failed load keeps the fallback.
  useEffect(() => {
    font?.load?.().catch((error) => log.warn('slide font failed to load', { font: settings.font, error }));
  }, [font]);
  useEffect(() => {
    monoFont?.load?.().catch((error) => log.warn('slide font failed to load', { font: settings.monoFont, error }));
  }, [monoFont]);
  return <SlideThemeContext.Provider value={settings}>{children}</SlideThemeContext.Provider>;
};

/**
 * The current theme's style, from the nearest `SlideThemeProvider` (default theme without one).
 */
export const useSlideThemeStyle = (): SlideThemeStyle => {
  const settings = useContext(SlideThemeContext);
  return useMemo(() => slideThemeStyle(settings), [settings]);
};

/**
 * The color scheme the current theme forces, for components that pick colors in script rather than CSS.
 */
export const useSlideColorScheme = (): 'light' | 'dark' | undefined => {
  const settings = useContext(SlideThemeContext);
  return THEMES[SlideTheme.isName(settings.base) ? settings.base : 'default'].colorScheme;
};

export type SlideThemeScopeProps = Util.ThemedClassName<PropsWithChildren<{}>>;

/**
 * Paints non-markdown slide content (linked objects) with the current theme, so their surfaces follow its mode.
 */
export const SlideThemeScope = ({ classNames, children }: SlideThemeScopeProps) => {
  const style = useSlideThemeStyle();
  return (
    <div className={mx('flex size-full', slideThemeClasses, classNames)} style={style}>
      {children}
    </div>
  );
};
