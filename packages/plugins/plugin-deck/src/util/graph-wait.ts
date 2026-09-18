//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import type * as AppGraph from '@dxos/app-graph/AppGraph';

import { openableChildren } from './openable-children.ts';

/** The first child of `id` a plank can open, or undefined if none arrives in time. */
export const firstOpenableChild = (
  registry: Registry.AtomRegistry,
  graph: AppGraph.ExpandableGraph,
  id: string,
  timeoutMs: number,
): Effect.Effect<string | undefined> =>
  Effect.callback<string>((resume) => {
    const [present] = openableChildren(graph, id);
    if (present) {
      resume(Effect.succeed(present));
      return;
    }

    const unsubscribe = registry.subscribe(graph.connections(id, 'child'), () => {
      const [first] = openableChildren(graph, id);
      if (first) {
        resume(Effect.succeed(first));
      }
    });
    return Effect.sync(unsubscribe);
  }).pipe(Effect.timeoutOrElse({ duration: `${timeoutMs} millis`, orElse: () => Effect.succeed(undefined) }));
