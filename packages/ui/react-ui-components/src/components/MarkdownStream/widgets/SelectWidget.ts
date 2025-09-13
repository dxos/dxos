//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/react-ui-editor';

/**
 * Simple prompt widget.
 */
export class SelectWidget extends WidgetType {
  constructor(private options: string[]) {
    super();
  }

  /**
   * NOTE: Container must set var based on user's identity.
   */
  override toDOM(): HTMLElement {
    return Domino.of('div')
      .attr('role', 'group')
      .classNames('flex flex-wrap gap-1')
      .child(
        ...this.options.map((option) =>
          Domino.of('button').classNames('dx-button').data('density', 'fine').text(option),
        ),
      )
      .build();
  }

  override eq(other: WidgetType): boolean {
    return other instanceof SelectWidget && JSON.stringify(other.options) === JSON.stringify(this.options);
  }
}
