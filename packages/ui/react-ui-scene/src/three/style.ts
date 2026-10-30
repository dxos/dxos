//
// Copyright 2026 DXOS.org
//

import { type ThemeMode } from '@dxos/react-ui-canvas';
import { type Style3D } from '@dxos/scene';

import { resolveHex } from './colors.ts';

export const THEMES_3D = ['cad', 'presentation', 'neu-light', 'neu-dark'] as const;
export type Theme3D = (typeof THEMES_3D)[number];

/** Whether the theme draws Neu bodies: Neu Light, always light, or Neu Dark, always dark. */
export const isNeuTheme = (theme: Theme3D): boolean => theme === 'neu-light' || theme === 'neu-dark';

/** The mode a 3D theme draws in: its own when it holds one (as a 2D theme's `mode`), otherwise the app's. */
export const themeMode3D = (theme: Theme3D, appMode: ThemeMode): ThemeMode =>
  theme === 'neu-light' ? 'light' : theme === 'neu-dark' ? 'dark' : appMode;

/**
 * How an element's surface is drawn: a lit standard or PBR surface, a see-through shell with a rim, or Neu (a matte
 * body in the Neu ground's tone, `color` being the hue its edges take).
 */
export type MaterialSpec = { color: string; kind: 'standard' | 'pbr' | 'rim' | 'neu'; alpha: number; edges: boolean };

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
  if (isNeuTheme(theme)) {
    // The body is the ground's tone, so the hue shows only as edges: every Neu element is edged.
    return { color, kind: 'neu', alpha, edges: true };
  }
  const kind = theme === 'presentation' ? (surface === 'glass' ? 'rim' : 'pbr') : 'standard';
  return { color, kind, alpha, edges: style?.border ?? false };
};

/** 3D looks since renamed, by their old id: a saved view or scene may still name them. */
export const RENAMED_THEMES_3D: Readonly<Record<string, Theme3D>> = { 'clay': 'neu-dark', 'clay-light': 'neu-light' };

/** The 3D look a stored id names, a renamed look by its new id; undefined for an id that names none. */
export const toTheme3D = (value: string | undefined): Theme3D | undefined =>
  THEMES_3D.find((theme) => theme === value) ??
  (value !== undefined && Object.hasOwn(RENAMED_THEMES_3D, value) ? RENAMED_THEMES_3D[value] : undefined);
