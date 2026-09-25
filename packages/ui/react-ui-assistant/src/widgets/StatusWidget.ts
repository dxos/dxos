//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

/**
 * AI status widget.
 */
export class StatusWidget extends WidgetType {
  constructor(private readonly text: string) {
    super();
  }

  override eq(other: this) {
    return this.text === other.text;
  }

  override toDOM() {
    return Domino.of('div').append(
      Domino.of('div')
        .classNames('relative overflow-hidden rounded-md')
        .append(
          Domino.of('div')
            .classNames('grid grid-cols-[24px_1fr] gap-x-0.5 gap-y-0 items-start px-0.5 py-0.5 text-placeholder')
            .append(
              Domino.of('div')
                .classNames('flex h-5 w-full shrink-0 items-center justify-center self-start')
                .append(Domino.svg('ph--info--regular').classNames('shrink-0 size-4 opacity-70')),
              Domino.of('div')
                .classNames('relative min-w-0')
                .append(
                  Domino.of('div')
                    .classNames('relative z-10 rounded-md text-sm leading-5')
                    .attributes({ 'data-status-text': '' })
                    .text(this.text),
                ),
            ),
        ),
    ).root;
  }

  override updateDOM(dom: HTMLElement) {
    dom.querySelector<HTMLElement>('[data-status-text]')?.replaceChildren(this.text);
    return true;
  }
}
