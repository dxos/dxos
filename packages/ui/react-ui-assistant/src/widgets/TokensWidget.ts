//
// Copyright 2026 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

import { formatTokens } from '../tokens.ts';

/** Width of the gutter the thread reserves beside its blocks for the count. */
export const TOKENS_GUTTER = 'pe-14';

/**
 * A block's estimated token count, in the gutter beside the block that follows it. Zero height, so
 * turning the labels on never moves a row; the count lies in the padding the thread reserves.
 */
export class TokensWidget extends WidgetType {
  constructor(private readonly count: number) {
    super();
  }

  override eq(other: this) {
    return this.count === other.count;
  }

  override toDOM() {
    return Domino.of('div')
      .classNames('relative h-0')
      .append(
        Domino.of('span')
          .classNames(
            'absolute top-6 -end-14 w-12 text-end text-xs leading-6 text-fg-subtle tabular-nums select-none pointer-events-none',
          )
          .attributes({ 'data-testid': 'assistant.tokens', 'aria-hidden': 'true' })
          .text(formatTokens(this.count)),
      ).root;
  }

  override updateDOM(dom: HTMLElement) {
    dom.querySelector('span')?.replaceChildren(formatTokens(this.count));
    return true;
  }
}
