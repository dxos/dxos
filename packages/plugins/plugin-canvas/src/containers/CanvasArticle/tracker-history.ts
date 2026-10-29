//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Atom from 'effect/reactivity/Atom';
import * as Stream from 'effect/Stream';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as HistoryTracker from '@dxos/app-framework/HistoryTracker';
import { type Obj, Ref } from '@dxos/echo';
import {
  type CreateHistory,
  type HistoryState,
  afterPatch,
  createCommitter,
  isHistoryContext,
} from '@dxos/react-ui-canvas/scene';

import { isCanvasHeads } from '#model';
import { CanvasOperation } from '#types';

export type TrackerHistoryOptions = {
  tracker: HistoryTracker.HistoryTracker;
  invoker: Pick<Capabilities.OperationInvoker, 'invoke'>;
  canvas: Obj.Unknown;
};

/**
 * The canvas's history on Composer's tracker (VIEWS.md §8): each edit is applied at once, in the gesture's frame, then
 * recorded as a `CanvasOperation.Patch` whose forward is already done, scoped to the canvas, so a focused canvas undoes
 * its own edits, the undo toast undoes the latest anywhere, and agents' `Apply` edits share the log.
 */
export const createTrackerHistory =
  ({ tracker, invoker, canvas }: TrackerHistoryOptions): CreateHistory =>
  (binding) => {
    const scope = canvas.id;
    const ref = Ref.make(canvas);
    const state = Atom.keepAlive(Atom.make<HistoryState>({ canUndo: false, canRedo: false }));
    const publish = () =>
      binding.registry.set(state, { canUndo: tracker.canUndo(scope), canRedo: tracker.canRedo(scope) });

    // The tracker patches the store, not a projection's own model, so only the store is recorded.
    const commit = createCommitter({ ...binding, model: () => undefined }, (changes, context, { mergeKey }) => {
      const change = changes.find(({ source }) => source === binding.store)?.change;
      if (!change || !isCanvasHeads(change.before) || !isCanvasHeads(change.after)) {
        return;
      }
      Effect.runFork(
        invoker
          .invoke(CanvasOperation.Patch, {
            canvas: ref,
            from: change.before,
            to: change.after,
            paths: change.paths,
            context,
            ...(mergeKey !== undefined ? { mergeKey } : {}),
          })
          .pipe(Effect.catchCause((cause) => Effect.logError('canvas edit not recorded', cause))),
      );
    });

    return {
      commit,
      undo: () => {
        const can = tracker.canUndo(scope);
        if (can) {
          void tracker.undoPromise(scope);
        }
        return can;
      },
      redo: () => {
        const can = tracker.canRedo(scope);
        if (can) {
          void tracker.redoPromise(scope);
        }
        return can;
      },
      state,
      connect: () => {
        // Undo and redo reach the canvas from anywhere (its keys, the toast, an agent), so the view follows the stream.
        const fiber = Effect.runFork(
          Stream.merge(
            Stream.fromPubSub(tracker.undoable).pipe(Stream.map(() => undefined)),
            Stream.fromPubSub(tracker.applied),
          ).pipe(
            Stream.runForEach((event) =>
              Effect.sync(() => {
                publish();
                if (event?.phase === 'after' && event.scope === scope) {
                  afterPatch(binding.view, isHistoryContext(event.context) ? event.context : undefined);
                }
              }),
            ),
          ),
        );
        publish();
        return () => void Effect.runFork(Fiber.interrupt(fiber));
      },
      view: binding.view,
    };
  };
