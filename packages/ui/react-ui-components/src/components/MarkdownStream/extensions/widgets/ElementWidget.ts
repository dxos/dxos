//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { type XmlWidgetFactory } from '../xml-tags';

export const ElementWidgetFactory: XmlWidgetFactory = ({ tag, ...props }) => new ElementWidget(tag, props);

/**
 * Simple widget to create HTML elements from XML props.
 */
export class ElementWidget extends WidgetType {
  constructor(
    private tag: string,
    private props: any,
  ) {
    super();
  }

  override toDOM(): HTMLElement {
    const el = document.createElement(this.tag);
    Object.entries(this.props ?? {}).forEach(([key, value]) => {
      if (key === 'children') {
        el.innerText = String(value);
      } else {
        el.setAttribute(key, String(value));
      }
    });

    return el;
  }

  override eq(other: WidgetType): boolean {
    return (
      other instanceof ElementWidget &&
      other.tag === this.tag &&
      JSON.stringify(other.props) === JSON.stringify(this.props)
    );
  }
}
