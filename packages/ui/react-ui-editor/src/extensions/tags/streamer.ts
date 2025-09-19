//
// Copyright 2025 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import { isNotFalsy } from '@dxos/util';

import { Domino } from '../../util';

const BLINK_RATE = 2_000;

export type StreamerOptions = {
  cursor?: boolean;
  fadeIn?: boolean;
};

/**
 * Extension that adds a blinking cursor widget at the end of the document.
 */
export const streamer = (options: StreamerOptions = {}): Extension => {
  return [options.cursor && cursor(), options.fadeIn && fadeIn()].filter(isNotFalsy);
};

/**
 * State field to manage the cursor widget decoration.
 */
const cursor = (): Extension => {
  const hideCursor = StateEffect.define();

  // State field to track if cursor should be shown.
  const showCursor = StateField.define<boolean>({
    create: () => true,
    update: (value, tr) => {
      for (const effect of tr.effects) {
        if (effect.is(hideCursor)) {
          return false;
        }
      }
      if (tr.docChanged) {
        return true;
      }
      return value;
    },
  });

  // View plugin to manage timer and dispatch effects.
  const timerPlugin = ViewPlugin.fromClass(
    class {
      timer: any;

      constructor(private view: EditorView) {}

      update(update: ViewUpdate) {
        if (update.docChanged) {
          clearTimeout(this.timer);
          this.timer = setTimeout(() => {
            this.view.dispatch({
              effects: hideCursor.of(null),
            });
          }, BLINK_RATE);
        }
      }

      destroy() {
        clearTimeout(this.timer);
      }
    },
  );

  // Decoration field that uses the showCursor state.
  const cursorDecoration = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (_decorations, tr) => {
      const show = tr.state.field(showCursor);
      if (!show) {
        return Decoration.none;
      }

      // Always place cursor at the end of the document.
      const endPos = tr.state.doc.length;
      return Decoration.set([
        Decoration.widget({
          widget: new CursorWidget(),
          side: 1, // Place after the position.
        }).range(endPos),
      ]);
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  return [showCursor, timerPlugin, cursorDecoration];
};

/**
 * Widget class for the cursor at the end of the document.
 * Half
 */
class CursorWidget extends WidgetType {
  toDOM() {
    return Domino.of('span')
      .style({ opacity: '0.8' })
      .child(Domino.of('span').text('\u258F').style({ animation: 'blink 2s infinite' }))
      .build();
  }
}

/**
 * State field to detect and decorate appended text.
 */
const fadeIn = (): Extension => {
  return [
    StateField.define<DecorationSet>({
      create: () => Decoration.none,
      update: (decorations, tr) => {
        if (!tr.docChanged) {
          return decorations;
        }

        // Check if content was appended at the end.
        const newDecorations: any[] = [];
        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
          // Don't fade in initial content.
          if (fromB === 0 && toB === inserted.length) {
            return;
          }

          // Check if the change is at the end of the document.
          if (toA === tr.startState.doc.length && inserted.length > 0) {
            newDecorations.push(Decoration.mark({ class: 'cm-fade-in' }).range(fromB, toB));
          }
        });

        if (newDecorations.length > 0) {
          // Combine existing decorations with new ones.
          return decorations.update({
            add: newDecorations,
            filter: (_from, _to) => {
              // Remove old decorations after a certain time or keep them.
              return true;
            },
          });
        }

        return decorations;
      },
      provide: (f) => EditorView.decorations.from(f),
    }),

    EditorView.theme({
      '.cm-fade-in': {
        animation: 'fade-in 1s ease-out forwards',
      },
      '@keyframes fade-in': {
        '0%': {
          opacity: '0',
        },
        '100%': {
          opacity: '1',
        },
      },
    }),
  ];
};
