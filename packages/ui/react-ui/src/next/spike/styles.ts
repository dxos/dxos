//
// Copyright 2026 DXOS.org
//

/**
 * Spike stylesheet: every layout rule keyed by `data-*` attributes, so the same CSS would serve a Solid binding.
 * Rendered by `SpikeStyles` rather than imported as a `.css` module to stay out of the package build.
 */
// Scoped to `.nx-*` elements with `--nx-*` variables so nothing here matches, or is read by, the current primitives.
export const styles = `
:is(.nx-scope, .nx-grid, .nx-scroll-root)[data-size=xs] { --nx-block-size: 1.25rem; --nx-line-height: var(--text-xs--line-height); --nx-font-size: var(--text-xs); --nx-icon-size: 0.75rem; --nx-gap-size: 0.25rem; }
:is(.nx-scope, .nx-grid, .nx-scroll-root)[data-size=sm] { --nx-block-size: 1.5rem; --nx-line-height: var(--text-sm--line-height); --nx-font-size: var(--text-sm); --nx-icon-size: 1rem; --nx-gap-size: 0.25rem; }
:is(.nx-scope, .nx-grid, .nx-scroll-root)[data-size=md] { --nx-block-size: 2rem; --nx-line-height: var(--text-base--line-height); --nx-font-size: var(--text-base); --nx-icon-size: 1.5rem; --nx-gap-size: 0.5rem; }
:is(.nx-scope, .nx-grid, .nx-scroll-root)[data-size=lg] { --nx-block-size: 2.5rem; --nx-line-height: var(--text-lg--line-height); --nx-font-size: var(--text-lg); --nx-icon-size: 2rem; --nx-gap-size: 0.5rem; }
:is(.nx-scope, .nx-grid, .nx-scroll-root)[data-size=xl] { --nx-block-size: 3rem; --nx-line-height: var(--text-xl--line-height); --nx-font-size: var(--text-xl); --nx-icon-size: 2.5rem; --nx-gap-size: 0.5rem; }

.nx-grid[data-gutter=rail] { --nx-gutter: var(--nx-block-size); }
.nx-grid[data-gutter=inset] { --nx-gutter: var(--nx-gap-size); }
.nx-grid[data-gutter=sm] { --nx-gutter: var(--dx-gutter-sm); }
.nx-grid[data-gutter=md] { --nx-gutter: var(--dx-gutter-md); }
.nx-grid[data-gutter=lg] { --nx-gutter: var(--dx-gutter-lg); }
.nx-grid[data-gutter=none] { --nx-gutter: 0px; }

/* Template root: owns the rails; the end track gives back whatever a native scrollbar consumes. */
.nx-grid {
  display: grid;
  min-width: 0;
  align-content: start;
  font-size: var(--nx-font-size);
  line-height: var(--nx-line-height);
}
.nx-grid:not([data-gutter=inherit]) {
  grid-template-columns:
    [full-start] var(--nx-gutter) [content-start] var(--nx-columns, minmax(0, 1fr))
    [content-end] calc(var(--nx-gutter) - var(--nx-scroll-reserve, 0px)) [full-end];
}

/* Inheriting container: real subgrid, so named lines and content-sized tracks carry through. */
.nx-grid[data-gutter=inherit] {
  grid-column: full;
  grid-template-columns: subgrid;
}

/* Placement: content by default; rails and full-bleed by attribute. */
.nx-grid > * { grid-column: content; }
.nx-grid > [data-place=full] { grid-column: full; }
.nx-grid > [data-rail=start] { grid-column: full-start / content-start; }
.nx-grid > [data-rail=end] { grid-column: content-end / full-end; }
.nx-grid[data-layout=row] { align-items: center; }
.nx-grid[data-layout=row] > :not([data-rail]) { grid-column: auto; }
.nx-grid[data-layout=row] > :nth-child(1 of :not([data-rail])) { grid-column-start: content-start; }

.nx-block {
  display: grid;
  place-items: center;
  width: var(--nx-block-size);
  height: var(--nx-block-size);
  justify-self: center;
}

/* Scroll frame: non-scrolling, positioned host for the overlay thumbs; subgrid when its viewport inherits. */
.nx-scroll-root {
  position: relative;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  grid-template-columns: minmax(0, 1fr);
  container-type: inline-size;
}
.nx-scroll-root:has(> .nx-grid[data-gutter=inherit]) {
  grid-column: full;
  grid-template-columns: subgrid;
  /* Containment makes a grid independent, which silently turns subgrid back into a standalone grid. */
  container-type: normal;
}
.nx-scroll-viewport {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.nx-scroll-viewport:not([data-native]) { scrollbar-width: none; }
.nx-scroll-viewport:not([data-native])::-webkit-scrollbar { display: none; }
.nx-scroll-viewport[data-native] {
  --nx-scroll-reserve: var(--nx-scroll-width);
  scrollbar-gutter: stable;
}
.nx-scroll-viewport[data-native]::-webkit-scrollbar { width: var(--nx-scroll-width); }
.nx-scroll-viewport[data-native]::-webkit-scrollbar-thumb { background: var(--color-scrollbar-thumb, gray); }

/* Responsive: collapse against the nearest container, never the viewport. */
@container (width < 24rem) {
  .nx-grid.nx-grid[data-gutter=rail] { --nx-gutter: var(--nx-gap-size); }
  .nx-grid[data-columns] { --nx-columns: minmax(0, 1fr); }
  .nx-grid > [data-rail] { display: none; }
  .nx-grid[data-layout=row] > :not([data-rail]) { grid-column: content; }
}

[data-debug] .nx-grid > * { outline: 1px dashed color-mix(in srgb, currentColor 25%, transparent); }
`;
