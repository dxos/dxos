//
// Copyright 2026 DXOS.org
//

/**
 * Symbol names for the `px` icon set, whose SVGs live in `assets/` and are compiled into the
 * sprite by `@dxos/vite-plugin-icons`.
 *
 * Each name is written out as a literal because the sprite is built by scanning sources for
 * `px--*--regular` strings, and a name assembled at runtime is invisible to that scanner. Hosts add
 * this module to `scanPaths`, so listing a glyph here is what puts it in the sprite — which in turn
 * is what lets callers compose `px--${name}--regular` freely.
 *
 * A glyph absent from the sprite is not lost: `extendedIconSource` in `@dxos/react-ui` fetches it
 * from `/px-icons/` at runtime. Being listed here is the difference between painting immediately and
 * painting after a round trip (and, in `composer-crx`, which serves no asset routes, between
 * painting and not).
 */
export const PxIcons = {
  // Reference icon.
  'circle': 'px--circle--regular',

  // Misc.
  'context-panel': 'px--context-panel--regular',
  'trapezoid': 'px--trapezoid--regular',

  // Estimate.
  'bar-high': 'px--bar-high--regular',
  'bar-low': 'px--bar-low--regular',
  'bar-medium': 'px--bar-medium--regular',

  // Line ends.
  'line-arrow': 'px--line-arrow--regular',
  'line-circle': 'px--line-circle--regular',
  'line-many': 'px--line-many--regular',
  'line-triangle': 'px--line-triangle--regular',

  // Vendor logos.
  'anthropic': 'px--anthropic--regular',
  'deepseek': 'px--deepseek--regular',
} as const;

export type PxIconName = keyof typeof PxIcons;

export type PxIconSymbol = (typeof PxIcons)[PxIconName];
