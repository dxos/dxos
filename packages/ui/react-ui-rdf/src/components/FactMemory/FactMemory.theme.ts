//
// Copyright 2026 DXOS.org
//

import { tv } from '@dxos/ui-theme';

/** Tailwind-variants theme for the {@link FactMemory} composite; call `.styles()` for the per-slot functions. */
const factMemoryStyles = tv({
  slots: {
    root: 'dx-expand grid grid-cols-1 md:grid-cols-2 gap-2',
    panel: 'min-h-0',

    // The held-out message.
    message: 'flex flex-col gap-2 p-3',
    messageMeta: 'flex items-center gap-2 text-xs text-fg-subtle',
    messageBody: 'text-sm',
    chips: 'flex flex-wrap gap-1',
    verdict: 'text-sm text-fg-muted',

    // What the store already knew.
    memoryList: 'flex flex-col gap-2 py-1',
    /*
     * The card owns the column track sizes and the inline padding, and each row is a `subgrid` across them, so
     * subjects, predicates, objects and dates line up down the card however wide any one of them is. The padding
     * has to sit here rather than on a row: a subgrid item's tracks start inside its own padding box, so a row
     * that padded itself would step out of the card's columns.
     */
    entity:
      'shrink-0 grid grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto] gap-x-2 px-3 py-1 dx-card-surface border border-separator-subtle rounded-sm overflow-hidden',
    entityHeader: 'col-span-full flex items-center justify-between gap-2 pb-1',
    entityName: 'font-medium truncate',
    entityCount: 'text-xs text-fg-subtle tabular-nums shrink-0',
    priorFact: 'col-span-full grid grid-cols-subgrid items-baseline py-0.5 text-sm',
    priorSubject: 'truncate',
    priorPredicate: 'text-fg-muted truncate',
    priorObject: 'truncate',
    priorAgent: 'text-xs text-fg-subtle truncate',
    // Dates are a column of digits read against each other, so they take the figures that align.
    priorDate: 'text-xs text-fg-subtle tabular-nums whitespace-nowrap',
  },
});

/** react-ui-rdf FactMemory theme. */
export const factMemoryTheme = {
  styles: factMemoryStyles,
};
