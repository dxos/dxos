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
    const icon = Domino.of('dx-icon' as any).attributes({ icon: 'ph--lightning--regular' });
    const textEl = Domino.of('span').classNames('truncate').text(this.text);
    const button = Domino.of('button')
      .attributes({ 'data-action': 'submit', 'data-density': 'fine', 'data-value': this.text })
      .classNames(mx('dx-button max-is-[100cqi] gap-2'))
      .children(icon, textEl);
    // NOTE: Scroll container must have `size-container`.
    return Domino.of('span').classNames(mx('inline-flex max-is-[100cqi] mlb-1 pie-2')).children(button).root;
  }
}
