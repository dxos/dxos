//
// Copyright 2025 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';

export type DropHandlerEvent = {
  text: string;
  url: string;
};

export type DropHandlerOptions = {
  onDrop?: (view: EditorView, pos: number, event: DropHandlerEvent) => void;
};

export type DropHandler = {
  extension: Extension;
  update: (position: { x: number; y: number } | null) => void;
  cancel: () => void;
  drop: (event: DropHandlerEvent) => void;
};

export const dropHandler = ({ onDrop = handleDrop }: DropHandlerOptions = {}): DropHandler => {
  const views = new Set<EditorView>();
  let state: { view: EditorView; pos: number } | null = null;

  const reset = () => {
    views.forEach((view) => view.dispatch({ effects: setDrop.of(null) }));
    state = null;
  };

  const extension: Extension = [
    dropField,
    ViewPlugin.fromClass(
      class {
        constructor(readonly _view: EditorView) {
          views.add(_view);
        }

        destroy() {
          views.delete(this._view);
        }
      },
    ),
  ];

  return {
    extension,
    update: (position: { x: number; y: number } | null) => {
      if (!position) {
        reset();
        return;
      }

      views.forEach((view) => {
        const rect = view.dom.getBoundingClientRect();
        if (
          position.x >= rect.left &&
          position.x <= rect.right &&
          position.y >= rect.top &&
          position.y <= rect.bottom
        ) {
          let pos = view.posAtCoords(position);
          if (pos !== null) {
            const word = view.state.wordAt(pos);
            if (word) {
              const startDist = Math.abs(pos - word.from);
              const endDist = Math.abs(pos - word.to);
              pos = startDist < endDist ? word.from : word.to;
            }

            view.dispatch({ effects: setDrop.of(pos) });
            state = { view, pos };
            return;
          }
        }

        view.dispatch({ effects: setDrop.of(null) });
      });
    },
    cancel: () => {
      reset();
    },
    drop: ({ text, url }) => {
      if (state) {
        onDrop(state.view, state.pos, { text, url });
      }

      reset();
    },
  } satisfies DropHandler;
};

const handleDrop = (view: EditorView, pos: number, event: DropHandlerEvent) => {
  const line = view.state.doc.lineAt(pos);
  if (line.text.trim() === '') {
    view.dispatch({
      changes: { from: pos, insert: `\n![${event.text}](${event.url})\n` },
      effects: setDrop.of(null),
    });
  } else {
    view.dispatch({
      changes: { from: pos, insert: ` [${event.text}](${event.url})` },
      effects: setDrop.of(null),
    });
  }
};

const setDrop = StateEffect.define<number | null>();

const dropField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (decorations, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setDrop)) {
        if (effect.value === null) {
          return Decoration.none;
        }
        return Decoration.set([
          Decoration.widget({
            widget: new (class extends WidgetType {
              toDOM() {
                const dom = document.createElement('span');
                dom.className = 'cm-drop-cursor';
                dom.style.borderLeft = '2px solid var(--dx-accentSurface)';
                dom.style.display = 'inline-block';
                dom.style.height = '1em';
                dom.style.verticalAlign = 'middle';
                return dom;
              }
            })(),
            side: 0,
          }).range(effect.value),
        ]);
      }
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});
