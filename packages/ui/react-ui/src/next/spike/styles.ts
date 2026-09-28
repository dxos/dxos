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

/* Levels: absolute levels reuse ui-theme's zones (data-surface), which paint and re-derive every aspect; each
   publishes its rung so a +1 child can pick the next one from its parent with a style query, not React context. */
.nx-grid[data-surface=sunken] { --nx-level: 0; }
.nx-grid[data-surface=chrome] { --nx-level: 1; }
.nx-grid[data-surface=base] { --nx-level: 2; }
.nx-grid[data-surface=raised] { --nx-level: 3; }
.nx-grid[data-surface=overlay] { --nx-level: 4; }
.nx-grid[data-surface=popup] { --nx-level: 5; }
@container style(--nx-level: 0) { .nx-grid[data-surface='+1'] { --nx-level: 1; --surface-bg: var(--dx-surface-chrome); box-shadow: none; } }
@container style(--nx-level: 1) { .nx-grid[data-surface='+1'] { --nx-level: 2; --surface-bg: var(--dx-surface-base); box-shadow: none; } }
@container style(--nx-level: 2) { .nx-grid[data-surface='+1'] { --nx-level: 3; --surface-bg: var(--dx-surface-raised); box-shadow: var(--shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1)); } }
@container style(--nx-level: 3) { .nx-grid[data-surface='+1'] { --nx-level: 4; --surface-bg: var(--dx-surface-overlay); box-shadow: var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1)); } }
@container style(--nx-level: 4) { .nx-grid[data-surface='+1'] { --nx-level: 5; --surface-bg: var(--dx-surface-popup); box-shadow: var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1)); } }

/* Choices (illustration only). Control sizing options, keyed on the scope's data-control. */
[data-control=step] :is([data-size=xs], [data-size=xs] *) { --nx-control-size: 1rem; --nx-control-icon: 0.75rem; }
[data-control=step] :is([data-size=sm], [data-size=sm] *) { --nx-control-size: 1.25rem; --nx-control-icon: 0.75rem; }
[data-control=step] :is([data-size=md], [data-size=md] *) { --nx-control-size: 1.5rem; --nx-control-icon: 1rem; }
[data-control=step] :is([data-size=lg], [data-size=lg] *) { --nx-control-size: 2rem; --nx-control-icon: 1.5rem; }
[data-control=step] :is([data-size=xl], [data-size=xl] *) { --nx-control-size: 2.5rem; --nx-control-icon: 2rem; }
[data-control=inset] :is([data-size=xs], [data-size=xs] *) { --nx-control-size: calc(var(--nx-block-size) - 4px); --nx-control-icon: 0.75rem; }
[data-control=inset] :is([data-size=sm], [data-size=sm] *) { --nx-control-size: calc(var(--nx-block-size) - 6px); --nx-control-icon: 0.75rem; }
[data-control=inset] :is([data-size=md], [data-size=md] *) { --nx-control-size: calc(var(--nx-block-size) - 8px); --nx-control-icon: 1rem; }
[data-control=inset] :is([data-size=lg], [data-size=lg] *) { --nx-control-size: calc(var(--nx-block-size) - 10px); --nx-control-icon: 1.25rem; }
[data-control=inset] :is([data-size=xl], [data-size=xl] *) { --nx-control-size: calc(var(--nx-block-size) - 12px); --nx-control-icon: 1.5rem; }
.nx-demo-control { align-self: center; height: var(--nx-control-size); min-width: var(--nx-control-size); display: inline-grid; place-items: center; padding-inline: var(--nx-gap-size); font-size: var(--nx-font-size); line-height: var(--nx-line-height); }
.nx-demo-control > svg { width: var(--nx-control-icon); height: var(--nx-control-icon); }
.nx-demo-control[data-square] { padding-inline: 0; }
[data-control=content] .nx-demo-control { --nx-control-icon: 1em; height: auto; min-width: 0; padding-block: 0.125rem; }
[data-control=content] .nx-demo-control[data-square] { padding: 0.25rem; }
.nx-demo-group { display: flex; align-items: center; gap: var(--nx-gap-size); min-height: var(--nx-block-size); }
[data-debug] .nx-demo-group { outline: 1px dashed color-mix(in srgb, currentColor 30%, transparent); }

/* Field layouts (illustration only). */
.nx-grid > .nx-field-contents { display: contents; }
.nx-grid > .nx-field-row { grid-column: full; display: grid; grid-template-columns: subgrid; align-items: center; }
:is(.nx-field-contents, .nx-field-row) > [data-part=label] { grid-column: content-start / field-start; padding-inline-end: var(--nx-gap-size); }
:is(.nx-field-contents, .nx-field-row) > :not([data-part=label]) { grid-column: field-start / content-end; }
.nx-grid > .nx-field-stack { display: flex; flex-direction: column; }

[data-debug] .nx-grid > * { outline: 1px dashed color-mix(in srgb, currentColor 25%, transparent); }
`;
