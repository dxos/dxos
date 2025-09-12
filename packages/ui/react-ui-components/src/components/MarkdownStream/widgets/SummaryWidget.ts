//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/react-ui-editor';

import { type XmlWidgetFactory } from '../extensions';

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
    return Domino.of('div').classNames('text-sm text-subdued').text(this.text).build();
  }

  override eq(other: WidgetType): boolean {
    return other instanceof SummaryWidget && other.text === this.text;
  }
}
