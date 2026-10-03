//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Locals are derived from `--surface-bg` inside the block rather than declared as global tokens: a
 * custom property that references another resolves against the element that DECLARES it, so a
 * surface-relative token defined at `:root` would be frozen to the root surface.
 */
const surfaces = {
  '--cm-diff-surface': 'oklch(from var(--surface-bg) calc(l + var(--dx-lift) * 0.02) c h)',
  '--cm-diff-chrome': 'oklch(from var(--surface-bg) calc(l + var(--dx-lift) * 0.04) c h)',
  '--cm-diff-hatch': 'oklch(from var(--surface-bg) calc(l + var(--dx-lift) * 0.05) c h)',
  '--cm-diff-gutter-fg': 'var(--color-subdued)',
  // Derived from the gutter colours so the hue has one source, but flatter and weaker: a whole
  // column of changed code is a large area, and the merge view's per-line tint reads as a wash here.
  '--cm-diff-add': 'oklch(from var(--color-cm-diff-add-gutter) l calc(c * 0.7) h / 0.16)',
  '--cm-diff-remove': 'oklch(from var(--color-cm-diff-remove-gutter) l calc(c * 0.7) h / 0.14)',
};

export const diffBlockTheme = EditorView.theme({
  '.cm-diff-block': {
    ...surfaces,
    margin: '0',
    border: '1px solid var(--color-separator)',
    borderRadius: '0.5rem',
    background: 'var(--cm-diff-surface)',
    overflow: 'hidden',
    fontSize: '0.8125rem',
    // A block widget's intrinsic width is the document's: an unconstrained chunk drags the prose
    // beside it past the pane. `100%` cannot break that cycle (it resolves against the width the
    // block itself is setting), so the cap is the query container — the host puts
    // `dx-container-type-inline-size` on a content element of definite width, as `documentSlots`
    // does. With no such container `cqi` falls back to the viewport, which is still a cap.
    maxWidth: 'min(100%, 100cqi)',
  },

  //
  // Header
  //

  '.cm-diff-header': {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    height: '2.75rem',
    minWidth: '0',
    padding: '0 0.875rem 0 0.5rem',
    background: 'var(--cm-diff-chrome)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.8125rem',
    lineHeight: '1',
    whiteSpace: 'nowrap',
  },
  '.cm-diff-toggle': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.5rem',
    height: '1.5rem',
    flex: '0 0 auto',
    padding: '0',
    border: 'none',
    borderRadius: '0.25rem',
    background: 'transparent',
    color: 'var(--color-description)',
    cursor: 'pointer',
  },
  '.cm-diff-toggle:hover': { background: 'var(--color-hover-surface)' },
  '.cm-diff-toggle svg': { width: '0.875rem', height: '0.875rem', transition: 'transform 150ms ease' },
  '.cm-diff-collapsed .cm-diff-toggle svg': { transform: 'rotate(-90deg)' },
  '.cm-diff-collapsed .cm-diff-body': { display: 'none' },

  '.cm-diff-path': { display: 'flex', minWidth: '0' },
  // The directory gives way first: the file name is what identifies the block.
  '.cm-diff-dir': {
    flex: '0 1 auto',
    minWidth: '0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--color-subdued)',
  },
  '.cm-diff-name': { flex: '0 0 auto', color: 'var(--color-base-fg)', fontWeight: '500' },

  '.cm-diff-stat': { flex: '0 0 auto', fontVariantNumeric: 'tabular-nums' },
  '.cm-diff-stat-added': { color: 'var(--color-cm-diff-add-gutter)' },
  '.cm-diff-stat-removed': { color: 'var(--color-cm-diff-remove-gutter)' },
  '.cm-diff-lang': { flex: '0 0 auto', color: 'var(--color-subdued)' },
  // Pushed to the trailing edge, so the range reads as chrome rather than as part of the path.
  '.cm-diff-range': { marginInlineStart: 'auto', flex: '0 0 auto', color: 'var(--color-subdued)' },
  // At the narrow layout the path and the counts are all the header has room to say.
  '.cm-diff-block[data-layout="inline"] .cm-diff-lang': { display: 'none' },
  '.cm-diff-block[data-layout="inline"] .cm-diff-range': { display: 'none' },

  //
  // Hunks
  //

  '.cm-diff-expander': {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    height: '2.25rem',
    minWidth: '0',
    padding: '0 0.875rem',
    borderBlock: '1px solid var(--color-subdued-separator)',
    background: 'var(--cm-diff-surface)',
    color: 'var(--color-description)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.8125rem',
  },
  '.cm-diff-expander:first-child': { borderBlockStart: 'none' },
  '.cm-diff-expander-icon': { width: '0.875rem', height: '0.875rem', flex: '0 0 auto' },
  // Without this the un-wrapping section label sets the block's minimum width, and a block widget's
  // minimum is the whole document's: the prose beside it would be pushed past the pane too.
  '.cm-diff-section': {
    minWidth: '0',
    color: 'var(--color-subdued)',
    fontFamily: 'var(--font-mono)',
    fontVariantLigatures: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  '.cm-diff-grid': {
    display: 'grid',
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.8',
    // Ligatures misreport a diff: JetBrains Mono draws `===` as `≡` and `=>` as `⇒`, so the reader
    // cannot tell which operator the change actually introduced.
    fontVariantLigatures: 'none',
  },
  '.cm-diff-body[data-layout="split"] .cm-diff-grid': {
    gridTemplateColumns: 'auto minmax(0, 1fr) auto minmax(0, 1fr)',
  },
  '.cm-diff-body[data-layout="inline"] .cm-diff-grid': {
    gridTemplateColumns: 'auto auto auto minmax(0, 1fr)',
  },

  '.cm-diff-num': {
    padding: '0 0.5rem 0 0.75rem',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.375rem',
    color: 'var(--cm-diff-gutter-fg)',
    fontVariantNumeric: 'tabular-nums',
    userSelect: 'none',
    // The sign stays on the first visual line of a wrapped row.
    alignItems: 'flex-start',
  },
  '.cm-diff-sign': { width: '0.5rem' },
  '.cm-diff-mark': {
    paddingInlineEnd: '0.5rem',
    color: 'var(--cm-diff-gutter-fg)',
    userSelect: 'none',
  },
  '.cm-diff-line': {
    paddingInlineEnd: '1rem',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    tabSize: '2',
    color: 'var(--color-base-fg)',
  },
  '.cm-diff-commentable': { position: 'relative' },
  // Hangs into the gutter to the left of the code so it never shifts the text it annotates.
  '.cm-diff-comment': {
    position: 'absolute',
    insetInlineStart: '-1.25rem',
    insetBlockStart: '0.125rem',
    width: '1.125rem',
    height: '1.125rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.25rem',
    border: 'none',
    background: 'var(--color-accent-bg)',
    color: 'var(--color-accent-fg)',
    fontSize: '0.875rem',
    lineHeight: '1',
    cursor: 'pointer',
    opacity: '0',
    transition: 'opacity 100ms ease',
  },
  '.cm-diff-commentable:hover .cm-diff-comment, .cm-diff-comment:focus-visible': { opacity: '1' },
  // The split gutter is a rule between the two versions, not a border on every cell.
  '.cm-diff-body[data-layout="split"] .cm-diff-split': {
    borderInlineStart: '1px solid var(--color-separator)',
    marginInlineStart: '0.5rem',
  },

  '.cm-diff-added': { background: 'var(--cm-diff-add)' },
  '.cm-diff-removed': { background: 'var(--cm-diff-remove)' },
  '.cm-diff-num.cm-diff-added, .cm-diff-mark.cm-diff-added': { color: 'var(--color-cm-diff-add-gutter)' },
  '.cm-diff-num.cm-diff-removed, .cm-diff-mark.cm-diff-removed': { color: 'var(--color-cm-diff-remove-gutter)' },

  '.cm-diff-filler': {
    backgroundImage:
      'repeating-linear-gradient(45deg, transparent 0 5px, var(--cm-diff-hatch) 5px 6px, transparent 6px 11px)',
  },
});

/**
 * Reading-mode tuning for a walkthrough document: headings and inline code take the reading
 * foreground rather than the editor's syntax accent, since here they are structure the reader
 * navigates by, not markup being authored. Optional, and separate from {@link diffBlockTheme} — a
 * host that wants the chunks inside a normal editing surface adds only that one.
 */
export const walkthroughTheme = (): Extension =>
  EditorView.theme({
    '&': {
      '--color-cm-heading': 'var(--color-base-fg)',
      '--color-cm-heading-number': 'var(--color-subdued)',
      '--color-cm-code-inline': 'var(--color-base-fg)',
    },
  });
