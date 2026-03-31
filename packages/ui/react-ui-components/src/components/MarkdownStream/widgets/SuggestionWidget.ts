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
    // NOTE: Container must have `dx-size-container` to support cqi.
    return Domino.of('span')
      .classNames(mx('inline-flex max-w-[calc(100cqi-8px)] my-1 pe-2 overflow-hidden'))
      .children(
        Domino.of('button')
          .attributes({
            'data-action': 'submit',
            'data-density': 'fine',
            'data-value': this.text,
          })
          .classNames(mx('dx-button gap-2 w-full overflow-hidden'))
          .children(
            Domino.of('dx-icon' as any).attributes({
              icon: 'ph--lightning--regular',
            }),
            Domino.of('span').classNames('flex-1 truncate min-w-0').text(this.text),
          ),
      ).root;
  }
}
