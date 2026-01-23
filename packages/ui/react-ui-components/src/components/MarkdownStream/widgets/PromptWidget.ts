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
    const inner = Domino.of('div').classNames('pli-3 plb-1.5 bg-[--user-fill] rounded-sm').text(this.text);
    return Domino.of('div').classNames('flex justify-end mlb-2').children(inner).root;
  }
}
