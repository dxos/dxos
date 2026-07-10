//
// Copyright 2026 DXOS.org
//

import { tv } from '@dxos/ui-theme';

/**
 * Tailwind-variants theme for the {@link FactViewer} composite. Consumers call
 * `factViewerTheme.styles()` for the per-slot class functions; each accepts an optional
 * `{ class: … }` override for per-instance merging (mirrors the react-ui-list theme pattern).
 */
const factViewerStyles = tv({
  slots: {
    // Toolbar spacer pushing the view toggles to the inline-end edge.
    toolbarSpacer: 'grow',

    // List view.
    listViewport: 'flex flex-col gap-2 py-1',

    // Graph view.
    graphContent: 'overflow-hidden',
    graphTree: 'w-full h-full',

    // Subject group card.
    group: 'shrink-0 flex flex-col bg-card-surface border border-subdued-separator rounded-sm overflow-hidden',
    groupHeader: 'flex px-3 py-1 items-center justify-between',
    groupConflict: 'flex items-center gap-1',

    // Fact row.
    row: 'flex flex-col items-stretch gap-2 px-3 py-1',
    rowQuote: 'text-sm text-description italic',
    rowGrid: 'grid grid-cols-[1fr_5rem] items-center justify-between gap-2',
    rowTriple: 'w-full grid grid-cols-[1fr_1rem_1fr_1rem_1fr] items-center flex-wrap',
    cell: 'bg-input-surface border border-subdued-separator rounded-sm px-2 py-0.5 font-medium whitespace-nowrap truncate',
    cellDivider: 'border border-subdued-separator',
    rowMeta: 'flex items-center justify-end gap-2 shrink-0',
    rowConfidence: 'text-xs text-subdued',
    rowAttribution: 'text-xs text-subdued text-right',
  },
  variants: {
    // Conflicting facts get a warning rule on the inline-start edge.
    conflicting: {
      true: { row: 'border-is-2 border-warning-border' },
    },
  },
});

/** react-ui-rdf FactViewer theme: call `.styles()` for per-slot class functions. */
export const factViewerTheme = {
  styles: factViewerStyles,
};
