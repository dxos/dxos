//
// Copyright 2023 DXOS.org
//

import { EditorView, WidgetType } from '@codemirror/view';

export type PreviewLinkRef = {
  suggest?: boolean; // TODO(burdon): Remove?
  block?: boolean;
  label: string;
  dxn: string;
};

export type PreviewLinkTarget = {
  label: string;
  text?: string; // TODO(burdon): Different from label?
  object?: any;
};

/**
 * Inline widget for echo/dxn links.
 *  [Label](echo:/123)
 */
export class AnchorInlineWidget extends WidgetType {
  // TODO(burdon): Change to object.
  constructor(
    readonly _label: string,
    readonly _dxn: string,
  ) {
    super();
  }

  override eq(other: this) {
    return this._dxn === other._dxn && this._label === other._label;
  }

  override toDOM(_view: EditorView) {
    const root = document.createElement('dx-anchor');
    root.classList.add('dx-tag--anchor');
    root.textContent = this._label;
    root.setAttribute('dxn', this._dxn);
    return root;
  }
}
