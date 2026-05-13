//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

import { styles } from './defaults';

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
    return Domino.of('div')
      .attributes({ role: 'group' })
      .classNames(styles.padding, 'flex flex-wrap gap-1')
      .append(
        ...this.options.map((option) =>
          Domino.of('button')
            .classNames('dx-button inline-block max-w-[100cqi]')
            .attributes({ 'data-action': 'submit', 'data-value': option, 'data-density': 'fine' })
            .text(option),
        ),
      ).root;
  }
}
