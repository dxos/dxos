//
// Copyright 2026 DXOS.org
//

import { type ThemeMode } from '@dxos/react-ui-canvas';
import { type Style3D } from '@dxos/scene';

import { resolveHex } from './colors.ts';

export const THEMES_3D = ['cad', 'presentation', 'clay', 'clay-light'] as const;
export type Theme3D = (typeof THEMES_3D)[number];

/** Whether the theme draws clay: Clay with the app's mode, or Clay Light always light. */
export const isClayTheme = (theme: Theme3D): boolean => theme === 'clay' || theme === 'clay-light';

/** The mode a 3D theme draws in: its own when it holds one (as a 2D theme's `mode`), otherwise the app's. */
export const themeMode3D = (theme: Theme3D, appMode: ThemeMode): ThemeMode =>
  theme === 'clay-light' ? 'light' : appMode;

/**
 * How an element's surface is drawn: a lit standard or PBR surface, a see-through shell with a rim, or clay (a matte
 * body in the soft ground's tone, `color` being the hue its edges take).
 */
export type MaterialSpec = { color: string; kind: 'standard' | 'pbr' | 'rim' | 'clay'; alpha: number; edges: boolean };

/** How see-through each surface is, before the element's own opacity. */
const SURFACE_ALPHA: Readonly<Record<NonNullable<Style3D['surface']>, number>> = {
  solid: 1,
  tint: 0.6,
  glass: 0.4,
  none: 0.12,
};

/** Resolves an element's style tokens for a 3D theme (design call 19): the theme decides the material. */
export const materialSpec = (style: Style3D | undefined, theme: Theme3D): MaterialSpec => {
  const surface = style?.surface ?? 'solid';
  const alpha = SURFACE_ALPHA[surface] * (style?.opacity ?? 1);
  const color = resolveHex(style?.hue);
  if (isClayTheme(theme)) {
    // The body is the ground's tone, so the hue shows only as edges: every clay element is edged.
    return { color, kind: 'clay', alpha, edges: true };
  }
  const kind = theme === 'presentation' ? (surface === 'glass' ? 'rim' : 'pbr') : 'standard';
  return { color, kind, alpha, edges: style?.border ?? false };
};

export const isTheme3D = (value: string | undefined): value is Theme3D => THEMES_3D.some((theme) => theme === value);
