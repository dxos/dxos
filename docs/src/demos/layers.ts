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
 * The roots of demo content: each island, and what a demo portals out of the page's own container (menus, dialogs).
 * That container is `.page-wrapper` on a Webflow page, and `.page` with its skip link on a Starlight page. Webflow's
 * styles stop at these roots and the island's preflight starts at them.
 */
export const ISLAND_ROOTS = '.dx-island, body > :not(.page-wrapper, .page, .sl-skip-link)';

/**
 * Cascade layer order on a docs page that hosts the tutorial app: as `PAGE_LAYERS`, with `page-revert` in Webflow's
 * place. Starlight leaves list markers, link underlines and media alignment to the browser, so the global preflight
 * would strip them; `page-revert` undoes the preflight across Starlight's page and stops at each embed, and
 * `island-base` beats Starlight inside one.
 */
export const DOCS_LAYERS = PAGE_LAYERS.map((layer) => (layer === 'webflow' ? 'page-revert' : layer));
