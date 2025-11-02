//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/react-ui';

/**
 * Simple summary widget.
 */
export class SummaryWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override eq(other: WidgetType) {
    return other instanceof SummaryWidget && other.text === this.text;
  }

  override toDOM() {
    return Domino.of('div').classNames('mbs-2 mbe-4 pis-2 pie-2 text-sm text-placeholder').text(this.text).build();
  }
}
