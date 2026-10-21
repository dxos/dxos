//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import {
  type BackgroundGrid,
  type SceneLook,
  type ThemeRegistry,
  resolveBackground,
  resolveLook,
} from '../../model/index.ts';

export type ResolvedLookOptions = {
  /** The theme chosen for the drawing, else `defaultTheme`. */
  theme?: string;
  defaultTheme?: string;
  styleSet?: string;
  background?: string;
  backgroundGrid?: BackgroundGrid;
};

/** The look a view draws with, from its host's choices, and the grid its theme's own background draws. */
export const useResolvedLook = (
  themes: ThemeRegistry,
  { theme, defaultTheme, styleSet, background, backgroundGrid }: ResolvedLookOptions,
): { look: SceneLook; themeGrid: BackgroundGrid } => {
  const look = useMemo(() => {
    const resolved = resolveLook(themes, { theme: theme ?? defaultTheme, styleSet, background });
    return backgroundGrid && backgroundGrid !== resolved.background.grid
      ? { ...resolved, background: { ...resolved.background, grid: backgroundGrid } }
      : resolved;
  }, [themes, theme, defaultTheme, styleSet, background, backgroundGrid]);
  // The grid the theme's own background draws, so the bar can tell an override from it.
  const themeGrid = useMemo(
    () => resolveBackground(themes, background ?? look.theme.background).grid,
    [themes, background, look.theme.background],
  );
  return { look, themeGrid };
};
