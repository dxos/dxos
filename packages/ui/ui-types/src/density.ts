//
// Copyright 2023 DXOS.org
//

/**
 * Density tier for UI surfaces.
 *
 * - `lg` — large touch targets (~40px buttons). Use for navigation rails,
 *   modal headers, primary toolbars where comfortable hit areas matter.
 * - `md` — default. Standard ~32px controls.
 * - `sm` — compact ~28px controls. Use in data-dense surfaces (tables,
 *   side panels, inline forms).
 */
export type Density = 'lg' | 'md' | 'sm';
