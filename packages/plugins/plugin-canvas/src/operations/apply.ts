//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { createFreehandProjection, isIntent, pruneOrphaned, recordChanges } from '@dxos/react-ui-canvas/headless';

import { CanvasOperation } from '#types';

import { isCanvasHeads } from '../model/store.ts';
import { InvalidIntentError } from './canvas.ts';
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
        const projection = createFreehandProjection({ registry, store: bound.store, sceneId: view ?? bound.root });
        const [change] = recordChanges([versions], () => {
          const before = registry.get(bound.store.views);
          intents.forEach((intent) => projection.apply(intent));
          // A deleted View node takes the records nothing else opens with it (VIEWS.md §7.4), in the same undo step.
          const after = registry.get(bound.store.views);
          const roots = [bound.root, ...Object.keys(after).filter((id) => bound.store.isRoot?.(id))];
          const pruned = pruneOrphaned(before, after, roots);
          if (pruned !== after) {
            registry.set(bound.store.views, pruned);
          }
        });
        // A canvas loaded from a database always has heads; without them nothing could be undone, so nothing is offered.
        return change && isCanvasHeads(change.before) && isCanvasHeads(change.after)
          ? { canvas: canvas.id, before: change.before, after: change.after, paths: change.paths }
          : { canvas: canvas.id, before: {}, after: {}, paths: [] };
      });
    }),
  ),
);

export default handler;
