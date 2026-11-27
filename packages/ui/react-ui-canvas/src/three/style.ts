//
// Copyright 2026 DXOS.org
//

import { type Fill, type Style3D } from '@dxos/scene';

import { type ThemeMode } from '../model/index.ts';
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

/** How see-through each fill is, before the element's own opacity; a pattern has no material, so it draws solid. */
const FILL_ALPHA: Readonly<Record<Fill, number>> = {
  solid: 1,
  pattern: 1,
  tint: 0.6,
  glass: 0.4,
  none: 0.12,
};

/** Whether a style rounds its solid's corners: any corners but `none`, and unset is square. */
export const isRounded = (style: Pick<Style3D, 'corners'> | undefined): boolean =>
  style?.corners !== undefined && style.corners !== 'none';

/** Whether a style draws its solid's edges: any stroke but `none`, and unset draws none. */
export const hasEdges = (style: Pick<Style3D, 'stroke'> | undefined): boolean =>
  style?.stroke !== undefined && style.stroke !== 'none';

/** Resolves an element's style tokens for a 3D theme (design call 19): the theme decides the material. */
export const materialSpec = (style: Style3D | undefined, theme: Theme3D): MaterialSpec => {
  const fill = style?.fill ?? 'solid';
  const alpha = FILL_ALPHA[fill] * (style?.opacity ?? 1);
  const color = resolveHex(style?.color);
  if (isNeuTheme(theme)) {
    // The body is the ground's tone, so the hue shows only as edges: every Neu element is edged.
    return { color, kind: 'neu', alpha, edges: true };
  }
  const kind = theme === 'presentation' ? (fill === 'glass' ? 'rim' : 'pbr') : 'standard';
  return { color, kind, alpha, edges: hasEdges(style) };
};

/** 3D looks since renamed, by their old id: a saved view or scene may still name them. */
export const RENAMED_THEMES_3D: Readonly<Record<string, Theme3D>> = { 'clay': 'neu-dark', 'clay-light': 'neu-light' };

/** The 3D look a stored id names, a renamed look by its new id; undefined for an id that names none. */
export const toTheme3D = (value: string | undefined): Theme3D | undefined =>
  THEMES_3D.find((theme) => theme === value) ??
  (value !== undefined && Object.hasOwn(RENAMED_THEMES_3D, value) ? RENAMED_THEMES_3D[value] : undefined);
