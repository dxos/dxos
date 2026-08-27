//
// Copyright 2026 DXOS.org
//

/**
 * Symbol names for the `px` icon set, whose SVGs live in `assets/` and are compiled into the
 * sprite by `@dxos/vite-plugin-icons`.
 *
 * Each name is written out as a literal because the sprite is built by scanning sources for
 * `px--*--regular` strings: a name assembled at runtime is invisible to the scanner, and unlike
 * `ph` the `px` set has no `IconSource` to fall back on, so a missing symbol renders nothing.
 * Hosts add this module to `scanPaths` so the whole set ships whether or not anything imports it.
 */
export const PxIcons = {
  anthropic: 'px--anthropic--regular',
  deepseek: 'px--deepseek--regular',
  circle: 'px--circle--regular',
} as const;

export type PxIconName = keyof typeof PxIcons;

export type PxIconSymbol = (typeof PxIcons)[PxIconName];
