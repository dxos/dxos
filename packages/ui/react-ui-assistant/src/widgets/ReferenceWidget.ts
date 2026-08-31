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
    // Inline-level root: the tag is registered `block: false`, and a block box here would break the
    // line on both sides — the sentence the reference sits in stops flowing around it.
    return Domino.of('span')
      .classNames('inline-flex align-baseline')
      .append(Domino.of('dx-anchor').classNames('dx-tag--anchor').attributes({ dxn: this.dxn }).text(this.text)).root;
  }
}
