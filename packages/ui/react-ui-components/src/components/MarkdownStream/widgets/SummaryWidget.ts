//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { $ } from '@dxos/ui';

/**
 * Simple summary widget.
 */
export class SummaryWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override eq(other: this) {
    return this.text === other.text;
  }

  override toDOM() {
    return $('<div>').addClass('mbs-2 mbe-4 pli-2 text-sm text-placeholder').text(this.text).get(0)!;
  }
}
