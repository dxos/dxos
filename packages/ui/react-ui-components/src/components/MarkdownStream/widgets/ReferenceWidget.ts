//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/react-ui-editor';

/**
 * Simple prompt widget.
 */
export class ReferenceWidget extends WidgetType {
  constructor(private refid: string) {
    super();
  }

  /**
   * NOTE: Container must set var based on user's identity.
   */
  override toDOM(): HTMLElement {
    return Domino.of<any>('dx-ref-tag').text(this.refid).build();
  }

  override eq(other: WidgetType): boolean {
    return other instanceof ReferenceWidget && other.refid === this.refid;
  }
}
