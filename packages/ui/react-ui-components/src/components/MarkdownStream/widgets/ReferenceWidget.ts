//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

export class ReferenceWidget extends WidgetType {
  constructor(
    private text: string,
    private dxn: string,
  ) {
    super();
  }

  override eq(other: this) {
    return this.dxn === other.dxn;
  }

  override toDOM() {
    return Domino.of('div')
      .classNames('pt-2 pb-2')
      .append(
        Domino.of('dx-anchor' as any)
          .classNames('dx-tag--anchor')
          .attributes({ dxn: this.dxn })
          .text(this.text),
      ).root;
  }
}
