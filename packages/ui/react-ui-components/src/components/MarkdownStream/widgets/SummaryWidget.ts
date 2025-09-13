//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/react-ui-editor';

/**
 * Simple summary widget.
 */
export class SummaryWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override toDOM(): HTMLElement {
    return Domino.of('div').classNames('text-sm text-subdued').text(this.text).build();
  }

  override eq(other: WidgetType): boolean {
    return other instanceof SummaryWidget && other.text === this.text;
  }
}
