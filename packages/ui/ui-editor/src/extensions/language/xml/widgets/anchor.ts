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
    /** Resolves a display label asynchronously (e.g. the object's name for a bare `#` link). */
    readonly _resolveLabel?: () => Promise<string | undefined>,
  ) {
    super();
  }

  override eq(other: this) {
    // Resolver presence participates: when the database arrives after the first build, the rebuilt
    // widget gains a resolver, and an id-only match would keep the old DOM with the bare label.
    return (
      this._dxn === other._dxn &&
      this._label === other._label &&
      this._trigger === other._trigger &&
      !!this._resolveLabel === !!other._resolveLabel
    );
  }

  override toDOM(_view: EditorView) {
    const root = document.createElement('dx-anchor');
    root.classList.add('dx-tag--anchor');
    root.textContent = this._label;
    root.setAttribute('dxn', this._dxn);
    if (this._trigger) {
      root.setAttribute('trigger', this._trigger);
    }
    if (this._resolveLabel) {
      void this._resolveLabel().then((label) => {
        // The widget may have been culled/replaced; only retouch a live element.
        if (label && root.isConnected) {
          root.textContent = label;
        }
      });
    }
    return root;
  }
}
