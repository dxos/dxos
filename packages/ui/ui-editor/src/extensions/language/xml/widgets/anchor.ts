//
// Copyright 2025 DXOS.org
//

import { EditorView, WidgetType } from '@codemirror/view';

/**
 * Inline widget for echo/dxn links (e.g., `[Label](echo:/123)`).
 * The <dx-anchor> tag is a web component that renders a link chip and popover.
 */
export class AnchorWidget extends WidgetType {
  constructor(
    readonly _label: string,
    readonly _dxn: string,
    /** Overrides the element's default (`hover`) preview trigger. */
    readonly _trigger?: 'hover' | 'click',
  ) {
    super();
  }

  override eq(other: this) {
    return this._dxn === other._dxn && this._label === other._label && this._trigger === other._trigger;
  }

  override toDOM(_view: EditorView) {
    const root = document.createElement('dx-anchor');
    root.classList.add('dx-tag--anchor');
    root.textContent = this._label;
    root.setAttribute('dxn', this._dxn);
    if (this._trigger) {
      root.setAttribute('trigger', this._trigger);
    }
    return root;
  }
}
