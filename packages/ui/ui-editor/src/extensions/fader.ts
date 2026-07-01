//
// Copyright 2025 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin } from '@codemirror/view';

const DEFAULT_REMOVAL_DELAY = 5_000; // ms.
const DEFAULT_COALESCE_WINDOW = 100; // ms.
const CLEANUP_INTERVAL = 1_000; // ms.

export type FaderOptions = {
  /** Time window in ms to coalesce adjacent appends into a single decoration. */
  coalesce?: number;
};

/**
 * Extension that decorates appended text with a fade-in effect.
 * Adjacent appends within the coalesce window are merged into a single decoration.
 * Decorations are queued with an expiry and removed by a timer.
 */
export const fader = (options: FaderOptions = {}): Extension => {
  const removalDelay = DEFAULT_REMOVAL_DELAY;
  const coalesceWindow = options.coalesce ?? DEFAULT_COALESCE_WINDOW;

  let lastCount = -1;
  const log = (expiries: number[]) => {
    if (expiries.length !== lastCount) {
      lastCount = expiries.length;
      // console.log('[fader] decorations:', lastCount);
    }
  };

  // Effect to remove all expired decorations.
  const dequeue = StateEffect.define<number>();

  // FIFO of expiry timestamps paired with a decoration set.
  // Tracks `batchStart` — the time the current coalesce batch began.
  type FaderState = {
    decorations: DecorationSet;
    expiries: number[];
    batchStart: number;
  };

  const fadeField = StateField.define<FaderState>({
    create: () => ({ decorations: Decoration.none, expiries: [], batchStart: 0 }),
    update: ({ decorations, expiries, batchStart }, tr) => {
      // Remove expired entries by count (FIFO order matches decoration insertion order).
      for (const effect of tr.effects) {
        if (effect.is(dequeue)) {
          const now = effect.value;
          let removeCount = 0;
          while (removeCount < expiries.length && expiries[removeCount] <= now) {
            removeCount++;
          }
          if (removeCount > 0) {
            expiries = expiries.slice(removeCount);
            let skipped = 0;
            decorations = decorations.update({
              filter: () => {
                if (skipped < removeCount) {
                  skipped++;
                  return false;
                }
                return true;
              },
            });
          }
        }
      }

      if (!tr.docChanged) {
        log(expiries);
        return { decorations, expiries, batchStart };
      }

      // Reset when document is cleared or fully replaced.
      let isReset = tr.state.doc.length === 0;
      if (!isReset && tr.startState.doc.length > 0) {
        tr.changes.iterChanges((fromA, toA) => {
          if (fromA === 0 && toA === tr.startState.doc.length) {
            isReset = true;
          }
        });
      }
      if (isReset) {
        log([]);
        return { decorations: Decoration.none, expiries: [], batchStart: 0 };
      }

      // Collect appended ranges.
      const now = Date.now();
      const add: { from: number; to: number }[] = [];
      tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        if (toA === tr.startState.doc.length && inserted.length > 0) {
          add.push({ from: fromB, to: toB });
        }
      });

      if (add.length > 0) {
        const canCoalesce = expiries.length > 0 && batchStart > 0 && now - batchStart < coalesceWindow;
        if (canCoalesce) {
          // Extend the last decoration: remove it, then add a merged one.
          let lastFrom = -1;
          let lastTo = -1;
          decorations.between(0, tr.state.doc.length, (from, to) => {
            lastFrom = from;
            lastTo = to;
          });

          if (lastFrom >= 0) {
            decorations = decorations.update({
              filter: (from, to) => !(from === lastFrom && to === lastTo),
            });

            const mergedFrom = Math.min(lastFrom, add[0].from);
            const mergedTo = add[add.length - 1].to;
            decorations = decorations.update({
              add: [Decoration.mark({ class: 'cm-fader' }).range(mergedFrom, mergedTo)],
            });

            // Update the last expiry rather than adding a new one.
            expiries = [...expiries.slice(0, -1), now + removalDelay];
          }
        } else {
          // New batch — record when it started.
          batchStart = now;
          expiries = [...expiries, now + removalDelay];
          decorations = decorations.update({
            add: add.map(({ from, to }) => Decoration.mark({ class: 'cm-fader' }).range(from, to)),
          });
        }
      }

      log(expiries);
      return { decorations, expiries, batchStart };
    },
    provide: (f) => EditorView.decorations.from(f, (value) => value.decorations),
  });

  // Timer that schedules removal based on the next pending expiry.
  const cleanup = ViewPlugin.fromClass(
    class {
      #timer: ReturnType<typeof setTimeout> | undefined;

      constructor(private view: EditorView) {
        this.#schedule();
      }

      update() {
        this.#schedule();
      }

      #schedule() {
        const { expiries } = this.view.state.field(fadeField);
        if (expiries.length === 0) {
          clearTimeout(this.#timer);
          this.#timer = undefined;
          return;
        }

        if (this.#timer !== undefined) {
          return;
        }

        // Wait at least CLEANUP_INTERVAL after the oldest expiry to batch removals.
        const delay = Math.max(CLEANUP_INTERVAL, expiries[0] - Date.now());
        this.#timer = setTimeout(() => {
          this.#timer = undefined;
          this.view.dispatch({ effects: dequeue.of(Date.now()) });
        }, delay);
      }

      destroy() {
        clearTimeout(this.#timer);
      }
    },
  );

  return [
    fadeField,
    cleanup,
    EditorView.theme({
      '.cm-fader': {
        animation: 'fader 1s ease-out forwards',
      },
      '@keyframes fader': {
        '0%': {
          textShadow: '0 0 16px rgba(100, 200, 255, 1), 0 0 32px rgba(100, 200, 255, 0.6)',
        },
        '100%': {},
      },
    }),
  ];
};
