//
// Copyright 2025 DXOS.org
// Based on https://github.com/codemirror/view/blob/main/src/placeholder.ts
//

import { type Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import { clientRectsFor, flattenRect } from '../../util';

type Content = string | HTMLElement | ((view: EditorView) => HTMLElement);

export type PlaceholderOptions = {
  content: Content;
  delay?: number;
};

/**
 * Shows a transient placeholder at the current cursor position.
 */
export const placeholder = ({ content, delay = 3_000 }: PlaceholderOptions): Extension => {
  const plugin = ViewPlugin.fromClass(
    class {
      _timeout: ReturnType<typeof setTimeout> | undefined;
      _decorations = Decoration.none;

      update(update: ViewUpdate) {
        if (this._timeout) {
          window.clearTimeout(this._timeout);
          this._timeout = undefined;
        }

        // Check if the active line (where cursor is) is empty.
        const activeLine = update.view.state.doc.lineAt(update.view.state.selection.main.head);
        const isEmpty = activeLine.text.trim() === '';
        if (isEmpty) {
          // Create widget decoration at the start of the current line.
          const lineStart = activeLine.from;
          this._timeout = setTimeout(() => {
            this._decorations = Decoration.set([
              Decoration.widget({
                widget: new PlaceholderWidget(content),
                side: 1,
              }).range(lineStart),
            ]);

            update.view.update([]);
          }, delay);
        }

        this._decorations = Decoration.none;
      }

      destroy() {
        if (this._timeout) {
          clearTimeout(this._timeout);
        }
      }
    },
    {
      provide: (plugin) => [EditorView.decorations.of((view) => view.plugin(plugin)?._decorations ?? Decoration.none)],
    },
  );

  return typeof content === 'string'
    ? [plugin, EditorView.contentAttributes.of({ 'aria-placeholder': content })]
    : plugin;
};

export class PlaceholderWidget extends WidgetType {
  constructor(readonly content: Content) {
    super();
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('span');
    wrap.className = 'cm-placeholder';
    wrap.style.pointerEvents = 'none';
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
