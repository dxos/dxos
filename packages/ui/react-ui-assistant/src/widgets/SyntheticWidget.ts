//
// Copyright 2026 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

/**
 * A system-generated turn: a trigger, an alarm wake-up, a continuation nudge, a tool result
 * recovered across a reload. Framed like the model's own panels so it reads as machinery rather
 * than prose, and glyphed as input, because it is a prompt nobody typed.
 *
 * Not {@link ReasoningWidget}: that widget's streaming trail (and the timers keeping it alive
 * across CodeMirror's widget rebuilds) belongs to prose the model is still writing. A synthetic
 * prompt arrives whole, so it needs none of it.
 */
export class SyntheticWidget extends WidgetType {
  constructor(private readonly text: string) {
    super();
  }

  override eq(other: this) {
    return this.text === other.text;
  }

  override toDOM() {
    return Domino.of('div')
      .classNames('border border-subdued-separator rounded-md dx-base-surface text-sm p-1')
      .append(
        Domino.of('div')
          .classNames('grid grid-cols-[24px_1fr] gap-x-0.5 items-start')
          .append(
            // One line tall, not padded: the glyph centres against the FIRST line of text however
            // many follow it, and `1lh` tracks the text's own line-height rather than restating it.
            Domino.of('div')
              .classNames('flex h-[1lh] shrink-0 items-center justify-center self-start')
              .append(Domino.svg('ph--lightning--regular').classNames('shrink-0 size-4 text-description')),
            // `items-start`, not centred: past `max-h` the box scrolls, and centred overflow puts
            // the first lines above the scroll origin where they cannot be reached.
            //
            // `whitespace-pre-wrap`: the renderer collapses paragraph breaks but keeps single
            // newlines, and a wake-up prompt puts its reminder on the line below its own preamble.
            Domino.of('div')
              .classNames(
                'flex items-start max-h-[5lh] overflow-y-auto dx-scrollbar-thin',
                'text-description whitespace-pre-wrap',
              )
              .text(this.text)
              .attributes({ 'data-synthetic-text': '' }),
          ),
      ).root;
  }

  override updateDOM(dom: HTMLElement) {
    dom.querySelector<HTMLElement>('[data-synthetic-text]')?.replaceChildren(this.text);
    return true;
  }
}
