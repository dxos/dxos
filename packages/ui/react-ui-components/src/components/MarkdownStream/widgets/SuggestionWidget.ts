//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { $, mx } from '@dxos/ui';

/**
 * Simple prompt widget.
 */
export class SuggestionWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override eq(other: this) {
    return this.text === other.text;
  }

  override toDOM() {
    const icon = $('<dx-icon>').attr('icon', 'ph--lightning--regular').get(0)!;
    const textEl = $('<span>').addClass('truncate').text(this.text).get(0)!;
    const button = $('<button>')
      .attr('data-action', 'submit')
      .attr('data-density', 'fine')
      .addClass(mx('dx-button max-is-[100cqi] gap-2'))
      .attr('data-value', this.text)
      .append([icon, textEl])
      .get(0)!;
    // NOTE: Scroll container must have `size-container`.
    return $('<span>').addClass(mx('inline-flex max-is-[100cqi] mlb-1 pie-2')).append(button).get(0)!;
  }
}
