//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/react-ui-editor';

/**
 * Simple prompt widget.
 */
export class PromptWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  /**
   * NOTE: Container must set var based on user's identity.
   */
  override toDOM(): HTMLElement {
    return Domino.of('div')
      .classNames('flex justify-end')
      .child(Domino.of('div').classNames('pli-3 plb-2 bg-[--user-fill] rounded-sm').text(this.text))
      .build();
  }

  override eq(other: WidgetType): boolean {
    return other instanceof PromptWidget && other.text === this.text;
  }
}
