//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

/**
 * Simple prompt widget.
 */
export class SelectWidget extends WidgetType {
  constructor(private options: string[]) {
    super();
  }

  override eq(other: this) {
    return JSON.stringify(this.options) === JSON.stringify(other.options);
  }

  /**
   * NOTE: Container must set var based on user's identity.
   */
  override toDOM() {
    const buttons = this.options.map((option) =>
      Domino.of('button')
        .classNames('dx-button inline-block max-is-[100cqi]')
        .attributes({ 'data-action': 'submit', 'data-value': option, 'data-density': 'fine' })
        .text(option),
    );
    return Domino.of('div')
      .attributes({ role: 'group' })
      .classNames('flex flex-wrap mbs-2 mbe-2 gap-1')
      .children(...buttons).root;
  }
}
