//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

import { styles } from './defaults';

/**
 * Simple stats widget.
 */
export class StatsWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override eq(other: this) {
    return this.text === other.text;
  }

  override toDOM() {
    return Domino.of('div').classNames(styles.padding, 'text-sm text-placeholder').text(this.text).root;
  }

  override updateDOM(dom: HTMLElement) {
    dom.textContent = this.text;
    return true;
  }
}
