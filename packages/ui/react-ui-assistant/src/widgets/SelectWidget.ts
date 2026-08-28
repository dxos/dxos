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
    return (
      Domino.of('div')
        .attributes({ role: 'group' })
        // Flex gap rather than per-item padding, since it never lands at a row's start.
        .classNames('flex flex-wrap gap-x-2 gap-y-2')
        .append(
          ...this.options.map((option) =>
            Domino.of('button')
              .classNames('dx-button dx-container-query-inline-size inline-block py-1')
              .attributes({ 'data-action': 'submit', 'data-value': option, 'data-density': 'md' })
              .text(option),
          ),
        ).root
    );
  }
}
