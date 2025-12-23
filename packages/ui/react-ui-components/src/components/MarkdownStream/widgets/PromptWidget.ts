//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { $ } from '@dxos/ui';

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
    const inner = $('<div>').addClass('pli-3 plb-1.5 bg-[--user-fill] rounded-sm').text(this.text).get(0)!;
    return $('<div>').addClass('flex justify-end mlb-2').append(inner).get(0)!;
  }
}
