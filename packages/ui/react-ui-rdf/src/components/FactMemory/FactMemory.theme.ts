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
    entity: 'shrink-0 flex flex-col dx-card-surface border border-separator-subtle rounded-sm overflow-hidden',
    entityHeader: 'flex items-center justify-between gap-2 px-3 py-1',
    entityName: 'font-medium truncate',
    entityCount: 'text-xs text-fg-subtle tabular-nums shrink-0',
    priorFact: 'grid grid-cols-[1fr_auto] items-baseline gap-2 px-3 py-0.5 text-sm',
    priorTriple: 'truncate',
    priorPredicate: 'text-fg-muted',
    priorMeta: 'text-xs text-fg-subtle whitespace-nowrap',
  },
});

/** react-ui-rdf FactMemory theme. */
export const factMemoryTheme = {
  styles: factMemoryStyles,
};
