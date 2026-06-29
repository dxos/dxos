//
// Copyright 2025 DXOS.org
//

import { EditorView, WidgetType } from '@codemirror/view';

/**
 * Inline widget for echo/dxn links.
 *  [Label](echo:/123)
 */
export class AnchorInlineWidget extends WidgetType {
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
