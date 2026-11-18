//
// Copyright 2026 DXOS.org
//

import { tv } from '@dxos/ui-theme';

/** Tailwind-variants theme for the {@link FactBelief} composite; call `.styles()` for the per-slot functions. */
const factBeliefStyles = tv({
  slots: {
    root: 'dx-expand grid grid-rows-[auto_minmax(0,1fr)] gap-2',

    // The standing answer.
    answerPanel: 'min-h-0',
    answerBody: 'flex flex-col gap-2 p-3',
    question: 'text-sm text-fg-muted',
    answerValue: 'text-xl font-medium',
    answerEmpty: 'text-xl font-medium text-fg-subtle',
    citation: 'text-xs text-fg-subtle',
    quote: 'text-sm text-fg-muted italic',

    // The claims behind it.
    historyList: 'flex flex-col gap-1 py-1',
    claim: 'grid grid-cols-[auto_1fr_auto] items-baseline gap-2 px-3 py-1 border-s-2 border-transparent',
    claimValue: 'font-medium truncate',
    claimMeta: 'text-xs text-fg-subtle whitespace-nowrap',
    claimQuote: 'col-span-3 px-3 pb-1 text-xs text-fg-muted italic',
  },
  variants: {
    // A withdrawn claim is dimmed and ruled, never hidden: that it is still here is the point.
    standing: {
      false: {
        claim: 'opacity-60 border-s-separator',
        claimValue: 'line-through',
      },
    },
  },
});

/** react-ui-rdf FactBelief theme. */
export const factBeliefTheme = {
  styles: factBeliefStyles,
};
