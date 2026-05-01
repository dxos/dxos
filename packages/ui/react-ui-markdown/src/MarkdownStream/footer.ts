//
// Copyright 2026 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

/**
 * Toggles the footer's visibility.
 */
export const setFooterVisibleEffect = StateEffect.define<boolean>();

/**
 * Renders a host-supplied React subtree as a CodeMirror block widget anchored at
 * `doc.length`. The widget lives inside the document, so it scrolls with content. Toggle
 * visibility via {@link setFooterVisibleEffect}; the decoration's position is mapped
 * through subsequent transactions so insertions at the end translate the anchor without
 * destroying the widget's DOM.
 */
export const streamFooter = (setRoot: (el: HTMLElement | null) => void): Extension => {
  const widget = new FooterWidget(setRoot);
  const buildSet = (length: number): DecorationSet =>
    Decoration.set([Decoration.widget({ widget, block: true, side: 1 }).range(length)]);

  const field = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (decos, tr) => {
      // Visibility flips through the explicit effect — handle first so a hide+show round
      // trip resets to a fresh decoration.
      for (const effect of tr.effects) {
        if (effect.is(setFooterVisibleEffect)) {
          return effect.value ? buildSet(tr.state.doc.length) : Decoration.none;
        }
      }

      // For doc edits, map the existing decoration through the change set so an insertion
      // at the end translates the position from old `doc.length` to new `doc.length`.
      // CM's diff treats the mapped decoration as identity-equal (per `widget.eq`), so the DOM
      // and the portaled React tree stay mounted.
      if (tr.docChanged && decos.size > 0) {
        return decos.map(tr.changes);
      }

      return decos;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  return [field];
};

/**
 * Block widget rendered at the end of the document. The DOM element is reported via
 * `setRoot` so the host React component can `createPortal` arbitrary content into it.
 */
class FooterWidget extends WidgetType {
  constructor(private readonly _setRoot: (el: HTMLElement | null) => void) {
    super();
  }

  // Singleton equality so CM keeps the same DOM element across decoration rebuilds —
  // the React subtree portaled into it is not unmounted on every doc change.
  override eq(_other: this): boolean {
    return true;
  }

  override ignoreEvent(): boolean {
    return true;
  }

  override toDOM(): HTMLElement {
    // The outer block-widget element is `position: relative` with zero flow height so it
    // does not push the document layout (autoScroll, line measurement, etc. ignore it).
    // The inner element is `position: absolute`, taking the React subtree out of flow — it
    // renders as a floating layer anchored to the doc tail without consuming space.
    const inner = Domino.of('div')
      .classNames('cm-stream-footer-content')
      .style({ position: 'absolute', left: '0', top: '0' });

    this._setRoot(inner.root);
    return Domino.of('div').classNames('cm-stream-footer').style({ position: 'relative', height: '0' }).append(inner)
      .root;
  }

  override destroy(): void {
    this._setRoot(null);
  }
}
