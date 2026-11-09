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
    /*
     * The LIST owns the column tracks — subject, predicate, object, factuality, author, date — and each card and
     * each row inside it is a `subgrid` across them, so the columns are the same down the whole list rather than
     * per card. Every card carries the same inline padding, so they stay aligned with each other.
     *
     * Every column sizes to its content, and an empty `1fr` track between the triple and its attribution takes
     * the slack. That ordering is what makes the row behave at both ends: with room to spare the slack track
     * grows and the names stay whole, and when the card is narrow it collapses first, after which the name
     * columns shrink together and truncate. A name column that was itself the flexible one took the entire
     * shortfall and was crushed to a letter while its neighbours kept their full width.
     */
    memoryList:
      'grid grid-cols-[minmax(0,max-content)_minmax(0,max-content)_minmax(0,max-content)_1fr_auto_minmax(0,max-content)_auto] gap-2 py-1',
    entity:
      'col-span-full grid grid-cols-subgrid shrink-0 px-3 py-1 dx-card-surface border border-separator-subtle rounded-sm',
    entityHeader: 'col-span-full flex items-center justify-between gap-2 pb-1',
    entityName: 'font-medium truncate',
    entityCount: 'text-xs text-fg-subtle tabular-nums shrink-0',
    priorFact: 'col-span-full grid grid-cols-subgrid items-baseline py-0.5 text-sm',
    priorSubject: 'truncate',
    priorPredicate: 'text-fg-muted truncate',
    priorObject: 'truncate',
    /** Empty: the column that takes the row's slack, so the attribution sits at the end whatever the names do. */
    priorSlack: '',
    priorAgent: 'text-xs text-fg-subtle truncate',
    // Dates are a column of digits read against each other, so they take the figures that align.
    priorDate: 'text-xs text-fg-subtle tabular-nums whitespace-nowrap',
  },
});

/** react-ui-rdf FactMemory theme. */
export const factMemoryTheme = {
  styles: factMemoryStyles,
};
