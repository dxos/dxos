//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '../../domino';
import { type XmlWidgetFactory } from '../xml-tags';

export const PromptWidgetFactory: XmlWidgetFactory = (props) => {
  const text = props.children?.[0];
  return typeof text === 'string' ? new PromptWidget(text) : null;
};

/**
 * Simple prompt widget.
 */
export class PromptWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override toDOM(): HTMLElement {
    // NOTE: Container must set var based on user's identity.
    return Domino.of('div')
      .classNames('flex justify-end')
      .child(Domino.of('div').classNames('p-2 bg-[--user-fill] rounded-sm').text(this.text))
      .build();
  }

  override eq(other: WidgetType): boolean {
    return other instanceof PromptWidget && other.text === this.text;
  }
}
