//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { type XmlWidgetFactory } from '../xml-tags';

// TODO(burdon): Type check ContentBlock.Summary?
export const SummaryWidgetFactory: XmlWidgetFactory = (props) => {
  const text = props.children?.[0];
  return typeof text === 'string' ? new SummaryWidget(text) : null;
};

/**
 * Simple summary widget.
 */
export class SummaryWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override toDOM(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'text-sm text-subdued';
    el.textContent = this.text;
    return el;
  }

  override eq(other: WidgetType): boolean {
    return other instanceof SummaryWidget && other.text === this.text;
  }
}
