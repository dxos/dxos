//
// Copyright 2026 DXOS.org
//

/**
 * Cascade layer order on a Webflow page that hosts demos: the react-ui theme's `LAYER_ORDER` with three layers
 * spliced in after Tailwind's preflight (`base`). Webflow beats the global preflight, so the page keeps its own
 * typography; Starlight's code frames beat Webflow; and `island-base`, a preflight scoped to `ISLAND_ROOTS`, beats
 * both inside a demo, below the theme's own base, component and utility layers.
 */
export const PAGE_LAYERS = [
  'properties',
  'theme',
  'dx-tokens',
  'user-tokens',
  'base',
  'webflow',
  'starlight',
  'island-base',
  'tw-base',
  'dx-base',
  'components',
  'tw-components',
  'dx-components',
  'utilities',
] as const;

/**
 * The roots of demo content on a Webflow page: each island, and what a demo portals out of `.page-wrapper` (menus,
 * dialogs). Webflow's styles stop at these and the island's preflight starts at them.
 */
export const ISLAND_ROOTS = '.dx-island, body > :not(.page-wrapper)';
