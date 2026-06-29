//
// Copyright 2026 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';
import { typewriterDrainingEffect } from '@dxos/ui-editor';

/**
 * Host-controlled visibility intent. The footer block widget is rendered only when this is
 * `true` AND typewriter is not actively draining its typewriter buffer — the latter is observed
 * through {@link typewriterDrainingEffect}. Removing the decoration during a drip avoids the
 * scroll-measure conflict between CM's view-line model and the floating absolute child.
 */
export const setFooterVisibleEffect = StateEffect.define<boolean>();

type FooterState = {
  /** Host wants the footer rendered. */
  wanted: boolean;
  /** Typewriter is actively dripping into the document. */
  draining: boolean;
  decorations: DecorationSet;
};

/**
 * Renders a host-supplied React subtree as a CodeMirror block widget anchored at
 * `doc.length`. The widget lives inside the document, so it scrolls with content.
 *
 * Toggle the host-intent visibility via {@link setFooterVisibleEffect}. The widget is also
 * automatically removed while {@link typewriterDrainingEffect} reports `true` and re-mounted
 * once the typewriter's buffer drains — this prevents the block widget from interfering with CM's
 * view-line measurement during the typewriter drip.
 *
 * For pure doc edits (no visibility transition), the decoration's position is mapped
 * through the change set so insertions at the end translate the anchor without destroying
 * the widget's DOM.
 */
export const footer = (setRoot: (el: HTMLElement | null) => void): Extension => {
  const widget = new FooterWidget(setRoot);
  const buildSet = (length: number): DecorationSet =>
    Decoration.set([Decoration.widget({ widget, block: true, side: 1 }).range(length)]);

  const field = StateField.define<FooterState>({
    create: () => ({ wanted: false, draining: false, decorations: Decoration.none }),
    update: (state, tr) => {
      let { wanted, draining, decorations } = state;
      for (const effect of tr.effects) {
        if (effect.is(setFooterVisibleEffect)) {
          wanted = effect.value;
        }
        if (effect.is(typewriterDrainingEffect)) {
          draining = effect.value;
        }
      }

      // Also gate on the document being non-empty: there's nothing for the footer to anchor
      // below, and rendering it on a blank doc looks like detached chrome.
      const docLength = tr.state.doc.length;
      const visible = wanted && !draining && docLength > 0;
      const wasVisible = decorations.size > 0;
      if (visible !== wasVisible) {
        decorations = visible ? buildSet(docLength) : Decoration.none;
      } else if (tr.docChanged && decorations.size > 0) {
        // Position-map the existing decoration so insertions at the end translate the
        // widget anchor without destroying the DOM (`widget.eq` is identity-true).
        decorations = decorations.map(tr.changes);
      }

      return { wanted, draining, decorations };
    },
    provide: (f) => EditorView.decorations.from(f, (state) => state.decorations),
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

    const el = Domino.of('div')
      .classNames('cm-stream-footer')
      .style({ position: 'relative', height: '0' })
      .append(inner);

    this._setRoot(inner.root);
    return el.root;
  }

  override destroy(): void {
    this._setRoot(null);
  }
}
