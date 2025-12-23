//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { $ } from '@dxos/ui';

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
    const anchor = $('<dx-anchor>').addClass('dx-tag--anchor').attr('refid', this.refid).text(this.text).get(0)!;
    return $('<div>').addClass('mbs-2 mbe-2').append(anchor).get(0)!;
  }
}
