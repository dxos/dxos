//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/react-ui';

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
        .classNames('inline-flex max-is-[100cqi] mbs-4 mbe-4 pie-2')
        .children(
          Domino.of('button')
            .data('action', 'submit')
            .data('value', this.text)
            .data('density', 'fine')
            .classNames('dx-button max-is-[100cqi] mbs-2 mbe-2 gap-2')
            .children(
              Domino.of<any>('dx-icon').attributes({ icon: 'ph--lightning--regular' }),
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
