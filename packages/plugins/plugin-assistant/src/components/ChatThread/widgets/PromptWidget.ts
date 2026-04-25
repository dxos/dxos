//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

/**
 * Simple prompt widget.
 */
export class PromptWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override eq(other: this) {
    return this.text === other.text;
  }

  /**
   * NOTE: An ancestor element must set `data-hue` so `.dx-panel` resolves to the user's hue tokens
   * (see `packages/ui/ui-theme/src/css/components/panel.css`).
   */
  override toDOM() {
    return Domino.of('div')
      .classNames('flex justify-end my-2')
      .append(Domino.of('div').classNames('dx-panel px-3 py-1.5 rounded-sm').text(this.text)).root;
  }
}
