//
// Copyright 2025 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';
import { isTruthy } from '@dxos/util';

const BLINK_RATE = 2_000;

export type StreamerOptions = {
  cursor?: boolean;
  // When true, uses defaults. When object, allows configuring removal delay.
  fadeIn?: boolean | { removalDelay?: number };
};

/**
 * Extension that adds a blinking cursor widget at the end of the document.
 */
export const streamer = (options: StreamerOptions = {}): Extension => {
  return [
    options.cursor && cursor(),
    options.fadeIn && fadeIn(typeof options.fadeIn === 'object' ? options.fadeIn : {}),
  ].filter(isTruthy);
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
      .children(Domino.of('span').text('\u258F').style({ animation: 'blink 2s infinite' }))
      .build();
  }
}

/**
 * State field to detect and decorate appended text with a fade-in effect.
 * Also schedules removal of the last appended decoration after a delay.
 */
const fadeIn = (options: { removalDelay?: number } = {}): Extension => {
  const FADE_IN_DURATION = 1_000; // ms.
  const DEFAULT_REMOVAL_DELAY = 5_000; // ms.
  const removalDelay = options.removalDelay ?? DEFAULT_REMOVAL_DELAY;

  // Effect to remove a specific decoration by range.
  const removeDecoration = StateEffect.define<{ from: number; to: number }>();

  // Decoration field that adds fade-in marks for appended content and responds to removal effects.
  const fadeField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (decorations, tr) => {
      let next = decorations;

      // Apply removals first, if any.
      for (const effect of tr.effects) {
        if (effect.is(removeDecoration)) {
          const target = effect.value;
          next = next.update({
            filter: (from, to) => !(from === target.from && to === target.to),
          });
        }
      }

      if (!tr.docChanged) {
        return next;
      }

      // Reset decorations if the entire content was replaced.
      let isReset = tr.state.doc.length === 0;
      if (!isReset) {
        tr.changes.iterChanges((fromA, toA) => {
          if (fromA === 0 && toA === tr.startState.doc.length) {
            isReset = true;
          }
        });
      }
      if (isReset) {
        return Decoration.none;
      }

      // Add fade-in decorations for appended content at the end only.
      const add: any[] = [];
      tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        // Don't fade in initial content.
        if (fromB === 0 && toB === inserted.length) {
          return;
        }
        // At-the-end append.
        if (toA === tr.startState.doc.length && inserted.length > 0) {
          add.push(Decoration.mark({ class: 'cm-fade-in' }).range(fromB, toB));
        }
      });

      return next.update({ add });
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  // View plugin that tracks appended ranges and schedules their removal.
  const timerPlugin = ViewPlugin.fromClass(
    class {
      // Map a simple key "from-to" to timer id.
      _timers = new Map<string, any>();

      constructor(private view: EditorView) {}

      update(update: ViewUpdate) {
        if (!update.docChanged) {
          return;
        }

        update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
          // Only consider appends at the end.
          if (toA !== update.startState.doc.length || inserted.length === 0) {
            return;
          }

          const key = `${fromB}-${toB}`;
          // Clear any prior timer for this exact range.
          if (this._timers.has(key)) {
            clearTimeout(this._timers.get(key));
          }

          const totalDelay = FADE_IN_DURATION + removalDelay;
          const id = setTimeout(() => {
            this.view.dispatch({ effects: removeDecoration.of({ from: fromB, to: toB }) });
            this._timers.delete(key);
          }, totalDelay);

          this._timers.set(key, id);
        });
      }

      destroy() {
        for (const id of this._timers.values()) {
          clearTimeout(id);
        }
        this._timers.clear();
      }
    },
  );

  return [
    fadeField,
    timerPlugin,
    EditorView.theme({
      '.cm-line > span': {
        opacity: '0.8',
      },
      '.cm-fade-in': {
        animation: 'fade-in 3s ease-out forwards',
      },
      '@keyframes fade-in': {
        '0%': {
          opacity: '0',
        },
        '80%': {
          opacity: '1',
        },
        '100%': {
          opacity: '0.8',
        },
      },
    }),
  ];
};
