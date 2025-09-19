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
    return (
      Domino.of('span')
        // NOTW: Scroll container must have `size-container`.
        .classNames('inline-flex max-is-[100cqi] pie-2')
        .child(
          Domino.of('button')
            .data('action', 'submit')
            .data('value', this.text)
            .data('density', 'fine')
            .classNames('dx-button max-is-[100cqi] mbs-2 mbe-2 gap-2')
            .child(
              //
              Domino.of<any>('dx-icon').attr('icon', 'ph--lightning--regular'),
              Domino.of('span').classNames('truncate').text(this.text),
            ),
        )
        .build()
    );
  }

  override eq(other: WidgetType): boolean {
    return other instanceof SuggestionWidget && other.text === this.text;
  }
}
