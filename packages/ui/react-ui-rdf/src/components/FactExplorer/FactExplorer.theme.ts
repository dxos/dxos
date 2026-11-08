//
// Copyright 2026 DXOS.org
//

import { tv } from '@dxos/ui-theme';

/**
 * Tailwind-variants theme for the {@link FactExplorer} composite. Consumers call
 * `factExplorerTheme.styles()` for the per-slot class functions; each accepts an optional `{ class: … }`
 * override for per-instance merging (mirrors the FactViewer theme pattern).
 */
const factExplorerStyles = tv({
  slots: {
    // Root grid: the overview above, the drill-down list below. `dx-expand` because the host's display type
    // varies — a story decorator lays it out with flex, a plugin surface with grid.
    root: 'dx-expand grid grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-2',
    overview: 'grid min-h-0 gap-2 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-2',
    panel: 'min-h-0',
    toolbarSpacer: 'grow',
    total: 'text-xs text-fg-subtle tabular-nums',

    // Ranked bar rows.
    rankList: 'flex flex-col',
    rankRow:
      'relative grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2 px-2 py-1 text-sm text-start cursor-pointer',
    // The bar sits behind the label so a long name stays readable at any width.
    rankBar: 'absolute inset-y-0.5 start-0 rounded-sm bg-accent-bg opacity-30 pointer-events-none',
    rankLabel: 'relative truncate',
    rankCount: 'relative text-end text-xs text-fg-subtle tabular-nums',

    // Cross-tab.
    matrix: 'overflow-auto',
    matrixGrid: 'grid text-xs',
    matrixCorner: 'sticky top-0 start-0 z-10 bg-base-surface',
    matrixColumnHeader: 'sticky top-0 z-[5] bg-base-surface px-1 py-1 text-fg-subtle truncate',
    matrixRowHeader: 'sticky start-0 z-[5] bg-base-surface pe-2 py-1 truncate',
    matrixCell: 'relative h-6 border border-separator-subtle cursor-pointer disabled:cursor-default',
    matrixCellFill: 'absolute inset-0 bg-accent-bg pointer-events-none',
    matrixCellValue: 'relative grid place-items-center h-full tabular-nums',
  },
  variants: {
    selected: {
      true: {
        rankRow: 'bg-hover font-medium',
        matrixCell: 'border-separator font-bold',
      },
    },
  },
});

/** react-ui-rdf FactExplorer theme: call `.styles()` for per-slot class functions. */
export const factExplorerTheme = {
  styles: factExplorerStyles,
};
