//
// Copyright 2026 DXOS.org
//

import { type Style3D } from '@dxos/scene';

import { resolveHex } from './colors.ts';

export const THEMES_3D = ['cad', 'presentation'] as const;
export type Theme3D = (typeof THEMES_3D)[number];

/** How an element's surface is drawn: a lit standard or PBR surface, or a see-through shell with a rim. */
export type MaterialSpec = { color: string; kind: 'standard' | 'pbr' | 'rim'; alpha: number; edges: boolean };

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
  const kind = theme === 'presentation' ? (surface === 'glass' ? 'rim' : 'pbr') : 'standard';
  return { color: resolveHex(style?.hue), kind, alpha, edges: style?.border ?? false };
};

export const isTheme3D = (value: string | undefined): value is Theme3D => THEMES_3D.some((theme) => theme === value);
