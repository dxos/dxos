//
// Copyright 2025 DXOS.org
//

import { EditorView, WidgetType } from '@codemirror/view';

import { getSize } from '@dxos/ui-theme';

/**
 * Inline widget for echo/eid links (e.g., `[Label](echo:///123)`).
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
    /** Leading icon, e.g. `{ icon: 'ph--git-pull-request--regular', classNames: 'text-green-500' }`. */
    readonly _icon?: { icon: string; classNames?: string },
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
      !!this._resolveLabel === !!other._resolveLabel &&
      this._icon?.icon === other._icon?.icon &&
      this._icon?.classNames === other._icon?.classNames
    );
  }

  override toDOM(_view: EditorView) {
    const root = document.createElement('dx-anchor');
    root.classList.add('dx-tag--anchor');
    root.setAttribute('eid', this._dxn);
    if (this._trigger) {
      root.setAttribute('trigger', this._trigger);
    }
    if (this._icon) {
      // An icon element carries no text, so the anchor's `textContent` stays the label it reports.
      const icon = root.appendChild(document.createElement('dx-icon'));
      icon.setAttribute('icon', this._icon.icon);
      icon.className = ['inline-block align-[-0.125em] me-1', getSize(4), this._icon.classNames]
        .filter(Boolean)
        .join(' ');
    }
    // The label lives in its own node so a resolved label replaces it without removing the icon.
    const label = root.appendChild(document.createTextNode(this._label));
    if (this._resolveLabel) {
      void this._resolveLabel().then((resolved) => {
        // The widget may have been culled/replaced; only retouch a live element.
        if (resolved && root.isConnected) {
          label.textContent = resolved;
        }
      });
    }
    return root;
  }
}
