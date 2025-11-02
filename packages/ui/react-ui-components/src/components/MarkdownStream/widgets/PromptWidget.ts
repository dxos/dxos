//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/react-ui';

/**
 * Simple prompt widget.
 */
export class PromptWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override eq(other: WidgetType) {
    return other instanceof PromptWidget && other.text === this.text;
  }

  /**
   * NOTE: Container must set var based on user's identity.
   */
  override toDOM() {
    return Domino.of('div')
      .classNames('flex justify-end mlb-2')
      .children(Domino.of('div').classNames('pli-3 plb-1.5 bg-[--user-fill] rounded-sm').text(this.text))
      .build();
  }
}
