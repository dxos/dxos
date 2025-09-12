//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/react-ui-editor';

/**
 * Simple prompt widget.
 */
export class SuggestionWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override toDOM(): HTMLElement {
    return Domino.of('button')
      .classNames('dx-button animate-[fadeIn_0.5s] gap-2')
      .child(Domino.of<any>('dx-icon').attr('icon', 'ph--lightning--regular'), Domino.of('span').text(this.text))
      .build();
  }

  override eq(other: WidgetType): boolean {
    return other instanceof SuggestionWidget && other.text === this.text;
  }
}
