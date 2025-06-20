//
// Copyright 2025 DXOS.org
//

// Based on https://github.com/codemirror/view/blob/main/src/placeholder.ts

import { type Extension } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, ViewPlugin } from '@codemirror/view';

import { clientRectsFor, flattenRect } from '../util';

class Placeholder extends WidgetType {
  constructor(readonly content: string | HTMLElement | ((view: EditorView) => HTMLElement)) {
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
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.top + lineHeight };
    }
    return rect;
  }

  override ignoreEvent() {
    return false;
  }
}

export function multilinePlaceholder(content: string | HTMLElement | ((view: EditorView) => HTMLElement)): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      constructor(readonly view: EditorView) {}

      declare update: () => void; // Kludge to convince TypeScript that this is a plugin value

      get decorations() {
        // Check if the active line (where cursor is) is empty
        const activeLine = this.view.state.doc.lineAt(this.view.state.selection.main.head);
        const isEmpty = activeLine.text.trim() === '';

        if (!isEmpty || !content) {
          return Decoration.none;
        }

        // Create widget decoration at the start of the current line
        const lineStart = activeLine.from;
        return Decoration.set([
          Decoration.widget({
            widget: new Placeholder(content),
            side: 1,
          }).range(lineStart),
        ]);
      }
    },
    { decorations: (v) => v.decorations },
  );
  return typeof content === 'string'
    ? [plugin, EditorView.contentAttributes.of({ 'aria-placeholder': content })]
    : plugin;
}
