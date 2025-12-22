//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

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
    return Domino.of('div').classNames('mbs-2 mbe-4 pli-2 text-sm text-placeholder').text(this.text).build();
  }
}
