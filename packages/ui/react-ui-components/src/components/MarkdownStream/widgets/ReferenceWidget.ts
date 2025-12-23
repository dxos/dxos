//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

export class ReferenceWidget extends WidgetType {
  constructor(
    private text: string,
    private refid: string,
  ) {
    super();
  }

  override eq(other: this) {
    return this.refid === other.refid;
  }

  override toDOM() {
    const anchor = Domino.of('dx-anchor' as any).classNames('dx-tag--anchor').attributes({ refid: this.refid }).text(this.text);
    return Domino.of('div').classNames('mbs-2 mbe-2').children(anchor).root;
  }
}
