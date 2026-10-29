//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { createFreehandProjection, isIntent, pruneOrphaned, recordChanges } from '@dxos/react-ui-canvas/headless';

import { Canvas, CanvasOperation } from '#types';

import { isCanvasHeads } from '../model/store.ts';
import { InvalidIntentError, NewerCanvasError, UnversionedCanvasError } from './canvas.ts';
import { withCanvasStore } from './patch-store.ts';

const handler: Operation.WithHandler<typeof CanvasOperation.Apply> = CanvasOperation.Apply.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ canvas: ref, view, intents }) {
      // The schema leaves intents untyped, so a malformed one is refused here before anything is written.
      if (!intents.every(isIntent)) {
        const invalid = intents.findIndex((intent) => !isIntent(intent));
        return yield* Effect.fail(
          new InvalidIntentError({ message: `Intent ${invalid} is not a valid canvas intent.` }),
        );
      }

      return yield* withCanvasStore(ref, ({ registry, bound, canvas, versions }) => {
        // A newer plugin's format may hold fields this one would drop; without heads the edit could not be undone.
        const refusal =
          Drawing.isCanvas(canvas) && Canvas.isNewerScene(canvas.schema)
            ? new NewerCanvasError({
                message: `Canvas ${canvas.id} is at ${canvas.schema}; update the Canvas plugin to edit it.`,
              })
            : !isCanvasHeads(versions.heads())
              ? new UnversionedCanvasError({ message: `Canvas ${canvas.id} has no version history.` })
              : undefined;
        if (refusal) {
          return Effect.fail(refusal);
        }

        const projection = createFreehandProjection({ registry, store: bound.store, sceneId: view ?? bound.root });
        const isRoot = 'isRoot' in bound.store ? bound.store.isRoot : undefined;
        const [change] = recordChanges([versions], () => {
          const before = registry.get(bound.store.views);
          intents.forEach((intent) => projection.apply(intent));
          // A deleted View node takes the records nothing else opens with it (VIEWS.md §7.4), in the same undo step.
          const after = registry.get(bound.store.views);
          const roots = [bound.root, ...Object.keys(after).filter((id) => isRoot?.(id))];
          const pruned = pruneOrphaned(before, after, roots);
          if (pruned !== after) {
            registry.set(bound.store.views, pruned);
          }
        });
        return Effect.succeed(
          change && isCanvasHeads(change.before) && isCanvasHeads(change.after)
            ? { canvas: canvas.id, before: change.before, after: change.after, paths: change.paths }
            : { canvas: canvas.id, before: {}, after: {}, paths: [] },
        );
      }).pipe(Effect.flatten);
    }),
  ),
);

export default handler;
