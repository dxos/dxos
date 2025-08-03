//
// Copyright 2025 DXOS.org
// Based on https://github.com/codemirror/view/blob/main/src/placeholder.ts
//

import { type Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import { clientRectsFor, flattenRect } from '../../util';

type Content = string | HTMLElement | ((view: EditorView) => HTMLElement);

export type PlaceholderOptions = {
  delay?: number;
  content: Content;
};

export const placeholder = ({ delay = 3_000, content }: PlaceholderOptions): Extension => {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations = Decoration.none;
      timeout: ReturnType<typeof setTimeout> | undefined;

      update(update: ViewUpdate) {
        if (this.timeout) {
          window.clearTimeout(this.timeout);
          this.timeout = undefined;
        }

        // Check if the active line (where cursor is) is empty.
        const activeLine = update.view.state.doc.lineAt(update.view.state.selection.main.head);
        const isEmpty = activeLine.text.trim() === '';
        if (isEmpty) {
          // Create widget decoration at the start of the current line.
          const lineStart = activeLine.from;
          this.timeout = setTimeout(() => {
            this.decorations = Decoration.set([
              Decoration.widget({
                widget: new Placeholder(content),
                side: 1,
              }).range(lineStart),
            ]);

            update.view.update([]);
          }, delay);
        }

        this.decorations = Decoration.none;
      }

      destroy() {
        if (this.timeout) {
          clearTimeout(this.timeout);
        }
      }
    },
    {
      provide: (plugin) => {
        return [EditorView.decorations.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none)];
      },
    },
  );

  return typeof content === 'string'
    ? [plugin, EditorView.contentAttributes.of({ 'aria-placeholder': content })]
    : plugin;
};

class Placeholder extends WidgetType {
  constructor(readonly content: Content) {
    super();
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('span');
    wrap.className = 'cm-placeholder';
    wrap.style.pointerEvents = 'none';
    wrap.appendChild(
      typeof this.content === 'string'
        ? document.createTextNode(this.content)
        : typeof this.content === 'function'
          ? this.content(view)
          : this.content.cloneNode(true),
    );
    wrap.setAttribute('aria-hidden', 'true');
    return wrap;
  }

  override coordsAt(dom: HTMLElement) {
    const rects = dom.firstChild ? clientRectsFor(dom.firstChild) : [];
    if (!rects.length) {
      return null;
    }

    const style = window.getComputedStyle(dom.parentNode as HTMLElement);
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
