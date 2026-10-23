//
// Copyright 2026 DXOS.org
//

import React, { type CSSProperties, type PropsWithChildren, createContext, useContext, useMemo } from 'react';

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
  const { colorScheme, vars } = THEMES[SlideTheme.isName(settings.name) ? settings.name : 'default'];
  const pick = (value: string | undefined, valid: (value: unknown) => value is string, fallback: string) =>
    valid(value) ? value : fallback;
  return {
    colorScheme,
    '--slide-bg': pick(settings.background, SlideTheme.isColor, vars.background),
    '--slide-fg': pick(settings.foreground, SlideTheme.isColor, vars.foreground),
    '--slide-accent': pick(settings.accent, SlideTheme.isColor, vars.accent),
    '--slide-code': vars.code,
    '--slide-separator': vars.separator,
    '--slide-font-body': pick(settings.font, SlideTheme.isFont, vars.fontBody),
    '--slide-font-heading': pick(settings.font, SlideTheme.isFont, vars.fontHeading),
    '--slide-font-mono': vars.fontMono,
  };
};

/** Classes that paint a slide from its theme variables. */
export const slideThemeClasses = 'bg-(--slide-bg) text-(color:--slide-fg) font-(family-name:--slide-font-body)';

const SlideThemeContext = createContext<SlideTheme.Settings>({});

export type SlideThemeProviderProps = PropsWithChildren<{ settings?: SlideTheme.Settings }>;

/**
 * Sets the theme of every slide rendered below it.
 */
export const SlideThemeProvider = ({ settings = {}, children }: SlideThemeProviderProps) => (
  <SlideThemeContext.Provider value={settings}>{children}</SlideThemeContext.Provider>
);

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
  return THEMES[SlideTheme.isName(settings.name) ? settings.name : 'default'].colorScheme;
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
