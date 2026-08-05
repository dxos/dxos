//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino, mx } from '@dxos/ui';

/**
 * Simple prompt widget.
 */
export class SuggestionWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override eq(other: this) {
    return this.text === other.text;
  }

  override toDOM() {
    // NOTE: Container must have `dx-inline-size-container` (or `dx-size-container`) to support cqi.
    //
    // Inline-level root so consecutive suggestions flow onto one wrapped line rather than stacking —
    // the tag is registered `block: false` and the renderer omits the usual block separator between
    // them.
    //
    // Vertical space must be **padding, never margin**: CodeMirror measures a widget from its own box,
    // and a margin sits outside what it can see, so the height model drifts from what is rendered, the
    // error accumulates down the document, and the turn-fold gutter markers end up visibly misaligned.
    // Adjacent chips are likewise spaced with trailing padding rather than a margin.
    return Domino.of('span')
      .classNames(mx('inline-flex max-w-[calc(100cqi-8px)] py-1 pe-1 overflow-hidden'))
      .append(
        Domino.of('button')
          .attributes({
            'data-density': 'md',
            'data-action': 'submit',
            'data-value': this.text,
          })
          .classNames(mx('dx-button gap-2 w-full overflow-hidden'))
          .append(
            Domino.of('dx-icon').attributes({
              icon: 'ph--lightning--regular',
            }),
            Domino.of('span').classNames('flex-1 truncate min-w-0').text(this.text),
          ),
      ).root;
  }
}
