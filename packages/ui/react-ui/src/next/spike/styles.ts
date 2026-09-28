//
// Copyright 2026 DXOS.org
//

/**
 * Spike stylesheet: every layout rule keyed by `data-*` attributes, so the same CSS would serve a Solid binding.
 * Rendered by `SpikeStyles` rather than imported as a `.css` module to stay out of the package build.
 */
export const styles = `
[data-size=xs] { --block-size: 1.25rem; --line-height: var(--text-xs--line-height); --font-size: var(--text-xs); --icon-size: 0.75rem; --gap-size: 0.25rem; }
[data-size=sm] { --block-size: 1.5rem; --line-height: var(--text-sm--line-height); --font-size: var(--text-sm); --icon-size: 1rem; --gap-size: 0.25rem; }
[data-size=md] { --block-size: 2rem; --line-height: var(--text-base--line-height); --font-size: var(--text-base); --icon-size: 1.5rem; --gap-size: 0.5rem; }
[data-size=lg] { --block-size: 2.5rem; --line-height: var(--text-lg--line-height); --font-size: var(--text-lg); --icon-size: 2rem; --gap-size: 0.5rem; }
[data-size=xl] { --block-size: 3rem; --line-height: var(--text-xl--line-height); --font-size: var(--text-xl); --icon-size: 2.5rem; --gap-size: 0.5rem; }

[data-gutter=rail] { --gutter: var(--block-size); }
[data-gutter=inset] { --gutter: var(--gap-size); }
[data-gutter=sm] { --gutter: var(--dx-gutter-sm); }
[data-gutter=md] { --gutter: var(--dx-gutter-md); }
[data-gutter=lg] { --gutter: var(--dx-gutter-lg); }
[data-gutter=none] { --gutter: 0px; }

/* Template root: owns the rails; the end track gives back whatever a native scrollbar consumes. */
.nx-grid {
  display: grid;
  min-width: 0;
  align-content: start;
  font-size: var(--font-size);
  line-height: var(--line-height);
}
.nx-grid:not([data-gutter=inherit]) {
  grid-template-columns:
    [full-start] var(--gutter) [content-start] var(--columns, minmax(0, 1fr))
    [content-end] calc(var(--gutter) - var(--scroll-reserve, 0px)) [full-end];
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
  width: var(--block-size);
  height: var(--block-size);
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
  --scroll-reserve: var(--scroll-width);
  scrollbar-gutter: stable;
}
.nx-scroll-viewport[data-native]::-webkit-scrollbar { width: var(--scroll-width); }
.nx-scroll-viewport[data-native]::-webkit-scrollbar-thumb { background: var(--color-scrollbar-thumb, gray); }

/* Responsive: collapse against the nearest container, never the viewport. */
@container (width < 24rem) {
  .nx-grid[data-gutter=rail] { --gutter: var(--gap-size); }
  .nx-grid[data-columns] { --columns: minmax(0, 1fr); }
  .nx-grid > [data-rail] { display: none; }
  .nx-grid[data-layout=row] > :not([data-rail]) { grid-column: content; }
}

[data-debug] .nx-grid > * { outline: 1px dashed color-mix(in srgb, currentColor 25%, transparent); }
`;
