//
// Copyright 2025 DXOS.org
// Based on https://github.com/codemirror/view/blob/main/src/placeholder.ts
//

import { type Extension, Facet } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import { clientRectsFor, flattenRect } from '../../util/index.ts';
import { isBusy } from '../state/busy.ts';

type Content = string | HTMLElement | ((view: EditorView) => HTMLElement);

/**
 * Placeholder text is not in the document, so a caret at its position belongs before it: the widget sorts after
 * the other widgets there, including a remote peer's caret.
 */
const PLACEHOLDER_SIDE = 2;

export const placeholderWidget = (content: Content) =>
  Decoration.widget({ widget: new PlaceholderWidget(content), side: PLACEHOLDER_SIDE });

/** The transient placeholders configured on an editor; the empty-document placeholder gives way while one shows. */
const transientPlaceholders = Facet.define<ViewPlugin<{ readonly visible: boolean }>>();

/**
 * Shows `content` while the document is empty, unless a {@link placeholder} hint is showing in its place.
 */
export const emptyPlaceholder = (content: string): Extension => [
  EditorView.decorations.of((view) =>
    view.state.doc.length > 0 || view.state.facet(transientPlaceholders).some((plugin) => view.plugin(plugin)?.visible)
      ? Decoration.none
      : Decoration.set(placeholderWidget(content).range(0)),
  ),
  EditorView.contentAttributes.of({ 'aria-placeholder': content }),
];

export type PlaceholderOptions = {
  content: Content;
  delay?: number;
  focusOnly?: boolean;
};

/**
 * Shows a transient placeholder at the current cursor position. When
 * `focusOnly` is set the placeholder is suppressed unless the editor has DOM
 * focus, and is hidden again when focus is lost.
 */
export const placeholder = ({ content, delay = 3_000, focusOnly = false }: PlaceholderOptions): Extension => {
  const plugin = ViewPlugin.fromClass(
    class {
      _timeout: ReturnType<typeof setTimeout> | undefined;
      _decorations = Decoration.none;

      get visible() {
        return this._decorations !== Decoration.none;
      }

      update(update: ViewUpdate) {
        // A busy-state toggle (e.g. transcription starting) carries no doc/selection/focus change,
        // so it must be detected explicitly to clear an already-scheduled placeholder.
        const busyChanged = isBusy(update.startState) !== isBusy(update.view.state);

        // React to actual user activity only. The empty `view.update([])`
        // dispatched from the timeout below carries no doc/selection/focus
        // change, so it falls through here as a no-op — that's how the
        // freshly-set widget survives long enough for the decoration
        // provider to read it. Without this gate, the unconditional reset
        // would clobber the decoration in the same tick and the placeholder
        // would never visibly render.
        if (!update.docChanged && !update.selectionSet && !update.focusChanged && !busyChanged) {
          return;
        }

        if (this._timeout) {
          window.clearTimeout(this._timeout);
          this._timeout = undefined;
        }
        this._decorations = Decoration.none;

        // Honour `focusOnly`: when the option is set and the editor isn't
        // focused, leave the placeholder hidden and skip rescheduling. The
        // next `focusChanged` update reschedules once focus returns.
        if (focusOnly && !update.view.hasFocus) {
          return;
        }

        // Suppress the hint while another extension owns the caret region (e.g. transcription).
        if (isBusy(update.view.state)) {
          return;
        }

        const activeLine = update.view.state.doc.lineAt(update.view.state.selection.main.head);
        if (activeLine.text.trim() !== '') {
          return;
        }

        const lineStart = activeLine.from;
        const view = update.view;
        this._timeout = setTimeout(() => {
          this._decorations = Decoration.set([placeholderWidget(content).range(lineStart)]);
          view.update([]);
        }, delay);
      }

      destroy() {
        if (this._timeout) {
          clearTimeout(this._timeout);
        }
      }
    },
    {
      provide: (plugin) => {
        return [EditorView.decorations.of((view) => view.plugin(plugin)?._decorations ?? Decoration.none)];
      },
    },
  );

  return [
    plugin,
    transientPlaceholders.of(plugin),
    typeof content === 'string' ? EditorView.contentAttributes.of({ 'aria-placeholder': content }) : [],
  ];
};

export class PlaceholderWidget extends WidgetType {
  constructor(readonly content: Content) {
    super();
  }

  override eq(other: PlaceholderWidget) {
    return other.content === this.content;
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('span');
    wrap.className = 'cm-placeholder';
    wrap.style.pointerEvents = 'none';
    // An inline-block starts a line box of its own, which would inherit the host line's hanging
    // indent (a list item's negative `text-indent`) and paint the text under the marker.
    wrap.style.textIndent = '0';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.appendChild(
      typeof this.content === 'string'
        ? document.createTextNode(this.content)
        : typeof this.content === 'function'
          ? this.content(view)
          : this.content.cloneNode(true),
    );

    return wrap;
  }

  override coordsAt(dom: HTMLElement) {
    const rects = dom.firstChild ? clientRectsFor(dom.firstChild) : [];
    if (!rects.length) {
      return null;
    }

    const style = getComputedStyle(dom.parentNode as HTMLElement);
    const rect = flattenRect(rects[0], style.direction !== 'rtl');
    const lineHeight = parseInt(style.lineHeight);
    if (rect.bottom - rect.top > lineHeight * 1.5) {
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.top + lineHeight,
      };
    }

    return rect;
  }

  override ignoreEvent() {
    return false;
  }
}
