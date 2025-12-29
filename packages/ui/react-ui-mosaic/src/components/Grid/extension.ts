//
// Copyright 2025 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';

export type DropHandlerOptions = {};

export type DropHandler = {
  extension: Extension;
  update: (position: { x: number; y: number } | null) => void;
  cancel: () => void;
  drop: (props: { text: string; url: string }) => void;
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
                const dom = document.createElement('div');
                dom.className = 'cm-drop-cursor';
                dom.style.borderTop = '2px solid var(--dx-accentSurface)';
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

export const dropHandler = (_options: DropHandlerOptions = {}): DropHandler => {
  const views = new Set<EditorView>();
  let state: { view: EditorView; pos: number } | null = null;

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
        state = null;
        views.forEach((view) => view.dispatch({ effects: setDrop.of(null) }));
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
          const pos = view.posAtCoords(position);
          if (pos !== null) {
            state = { view, pos };
            view.dispatch({ effects: setDrop.of(pos) });
            return;
          }
        }

        view.dispatch({ effects: setDrop.of(null) });
      });
    },
    cancel: () => {
      views.forEach((view) => view.dispatch({ effects: setDrop.of(null) }));
      state = null;
    },
    drop: ({ text, url }) => {
      if (state) {
        // TODO(burdon): Configure callback.
        state.view.dispatch({
          changes: { from: state.pos, insert: `[${text}](${url}) ` },
          effects: setDrop.of(null),
        });
      }

      state = null;
      views.forEach((view) => view.dispatch({ effects: setDrop.of(null) }));
    },
  } satisfies DropHandler;
};
