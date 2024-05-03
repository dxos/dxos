//
// Copyright 2024 DXOS.org
//

import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import { type CommandOptions } from './command';
import { commandState } from './state';
import { clientRectsFor, flattenRect } from '../util/dom';

class CommandHint extends WidgetType {
  constructor(readonly content: string | HTMLElement) {
    super();
  }

  toDOM() {
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
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.top + lineHeight };
    }
    return rect;
  }

  override ignoreEvent() {
    return false;
  }
}

export const hintViewPlugin = ({ onHint }: CommandOptions) =>
  ViewPlugin.fromClass(
    class {
      deco = Decoration.none;
      update(update: ViewUpdate) {
        const builder = new RangeSetBuilder<Decoration>();
        const cState = update.view.state.field(commandState, false);
        if (!cState?.tooltip) {
          const selection = update.view.state.selection.main;
          const line = update.view.state.doc.lineAt(selection.from);
          // Only show if blank line.
          // TODO(burdon): Clashes with placeholder if pos === 0.
          // TODO(burdon): Show after delay or if blank line above?
          if (selection.from === selection.to && line.from === line.to) {
            const hint = onHint();
            if (hint) {
              builder.add(selection.from, selection.to, Decoration.widget({ widget: new CommandHint(hint) }));
            }
          }
        }

        this.deco = builder.finish();
      }
    },
    {
      provide: (plugin) => [EditorView.decorations.of((view) => view.plugin(plugin)?.deco ?? Decoration.none)],
    },
  );
