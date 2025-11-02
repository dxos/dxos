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
        .classNames('inline-flex max-is-[100cqi] mbs-3 mbe-3 pie-2')
        .children(
          Domino.of('button')
            .data('action', 'submit')
            .data('density', 'fine')
            .classNames('dx-button max-is-[100cqi] gap-2')
            .data('value', this.text)
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
