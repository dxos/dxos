//
// Copyright 2024 DXOS.org
// Based on https://github.com/codemirror/view/blob/main/src/placeholder.ts
//

import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import { clientRectsFor, flattenRect } from '../../util';

import { commandState } from './state';

export type HintOptions = {
  delay?: number;
  onHint?: () => string | undefined;
};

/**
 * @deprecated
 */
// TODO(burdon): Reconcile with `placeholder`.
export const hint = ({ delay = 3_000, onHint }: HintOptions): Extension => {
  return ViewPlugin.fromClass(
    class {
      _timeout: ReturnType<typeof setTimeout> | undefined;
      _decorations = Decoration.none;

      update(update: ViewUpdate) {
        if (this._timeout) {
          clearTimeout(this._timeout);
          this._timeout = undefined;
        }

        const builder = new RangeSetBuilder<Decoration>();
        const cState = update.view.state.field(commandState, false);
        if (!cState?.tooltip) {
          const selection = update.view.state.selection.main;
          const line = update.view.state.doc.lineAt(selection.from);
          // Only show if blank line.
          if (selection.from === selection.to && line.from === line.to) {
            // Set timeout to add decoration after delay.
            this._timeout = setTimeout(() => {
              const hint = onHint?.();
              if (hint) {
                const builder = new RangeSetBuilder<Decoration>();
                builder.add(selection.from, selection.to, Decoration.widget({ widget: new PlaceholderWidget(hint) }));
                this._decorations = builder.finish();
                update.view.update([]);
              }
            }, delay);
          }
        }

        this._decorations = builder.finish();
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
};

export class PlaceholderWidget extends WidgetType {
  constructor(readonly content: string | HTMLElement) {
    super();
  }

  toDOM(): HTMLSpanElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-placeholder';
    wrap.style.pointerEvents = 'none';
    wrap.appendChild(typeof this.content === 'string' ? document.createTextNode(this.content) : this.content);
    if (typeof this.content === 'string') {
      wrap.setAttribute('aria-label', 'placeholder ' + this.content);
    } else {
      wrap.setAttribute('aria-hidden', 'true');
    }

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

  override ignoreEvent(): boolean {
    return false;
  }
}
