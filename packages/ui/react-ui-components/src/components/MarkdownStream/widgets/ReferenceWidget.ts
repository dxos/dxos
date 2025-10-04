//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/react-ui';

export class ReferenceWidget extends WidgetType {
  constructor(
    private text: string,
    private refid: string,
  ) {
    super();
  }

  override toDOM(): HTMLElement {
    return Domino.of<any>('dx-anchor').classNames('dx-tag--anchor').attr('refid', this.refid).text(this.text).build();
  }

  override eq(other: WidgetType): boolean {
    return other instanceof ReferenceWidget && other.refid === this.refid;
  }
}
