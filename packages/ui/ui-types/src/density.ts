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
 * - `xs` — ultra-compact ~24px controls. Reserve for chrome that is not the
 *   primary hit target (status bars, inline chips, pointer-fine grids).
 *   Below the WCAG 2.5.5 (Level AAA) 24×24 minimum once padding is included;
 *   avoid for touch surfaces.
 */
export type Density = 'lg' | 'md' | 'sm' | 'xs';
