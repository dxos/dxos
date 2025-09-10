//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

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
    const el = document.createElement('div');
    el.className = 'flex justify-end';
    const inner = document.createElement('div');
    // NOTE: Container must set var based on user's identity.
    inner.className = 'p-2 bg-[--user-fill] rounded-sm';
    inner.textContent = this.text;
    el.appendChild(inner);
    return el;
  }

  override eq(other: WidgetType): boolean {
    return other instanceof PromptWidget && other.text === this.text;
  }
}
