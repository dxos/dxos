//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

/**
 * Simple prompt widget.
 */
export class PromptWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override eq(other: this) {
    return this.text === other.text;
  }

  /**
   * NOTE: Container must set var based on user's identity.
   */
  override toDOM() {
    const inner = Domino.of('div').classNames('px-3 py-1.5 bg-[--user-fill] rounded-xs').text(this.text);
    return Domino.of('div').classNames('flex justify-end my-2').children(inner).root;
  }
}
