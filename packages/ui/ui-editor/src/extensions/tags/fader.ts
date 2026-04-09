//
// Copyright 2025 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin } from '@codemirror/view';

const DEFAULT_REMOVAL_DELAY = 50_000; // ms.

export type FaderOptions = {};

/**
 * Extension that decorates appended text with a fade-in effect.
 * Decorations are queued with an expiry and removed by a timer.
 */
export const fader = (options: FaderOptions = {}): Extension => {
  const removalDelay = DEFAULT_REMOVAL_DELAY;

  let lastCount = -1;
  const log = (pending: number[]) => {
    if (pending.length !== lastCount) {
      lastCount = pending.length;
      console.log('[fader] decorations:', lastCount);
    }
  };

  // Effect to remove all expired decorations.
  const dequeue = StateEffect.define<number>();

  // FIFO of expiry timestamps paired with a decoration set.
  // Decorations map through changes automatically; the FIFO tracks expiry order.
  const fadeField = StateField.define<{ decorations: DecorationSet; expiries: number[] }>({
    create: () => ({ decorations: Decoration.none, expiries: [] }),
    update: ({ decorations, expiries }, tr) => {
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
        return { decorations, expiries };
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
        return { decorations: Decoration.none, expiries: [] };
      }

      // Add fade-in decorations for appended content at the end.
      const now = Date.now();
      const add: { from: number; to: number }[] = [];
      tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        if (toA === tr.startState.doc.length && inserted.length > 0) {
          add.push({ from: fromB, to: toB });
        }
      });

      if (add.length > 0) {
        expiries = [...expiries, ...add.map(() => now + removalDelay)];
        decorations = decorations.update({
          add: add.map(({ from, to }) => Decoration.mark({ class: 'cm-fader' }).range(from, to)),
        });
      }

      log(expiries);
      return { decorations, expiries };
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

        const delay = Math.max(0, expiries[0] - Date.now());
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
        animation: 'fader 3s ease-out forwards',
      },
      '@keyframes fader': {
        '0%': {
          // Glow effect.
          textShadow: '0 0 16px rgba(100, 200, 255, 1), 0 0 32px rgba(100, 200, 255, 0.6)',
        },
        '100%': {},
      },
    }),
  ];
};
