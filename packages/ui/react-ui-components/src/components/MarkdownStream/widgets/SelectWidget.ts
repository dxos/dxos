//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { $ } from '@dxos/ui';

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
    const buttons = this.options.map(
      (option) =>
        $('<button>')
          .addClass('dx-button inline-block max-is-[100cqi]')
          .attr('data-action', 'submit')
          .attr('data-value', option)
          .attr('data-density', 'fine')
          .text(option)
          .get(0)!,
    );
    return $('<div>').attr('role', 'group').addClass('flex flex-wrap mbs-2 mbe-2 gap-1').append(buttons).get(0)!;
  }
}
