//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import * as AppGraph from '@dxos/app-graph/AppGraph';

import { openableChildren } from './openable-children.ts';

/** Waits up to `timeoutMs` for any of `ids` the graph does not hold yet. */
export const awaitNodes = (
  graph: AppGraph.ReadableGraph,
  ids: readonly string[],
  timeoutMs: number,
): Effect.Effect<void> =>
  Effect.all(
    ids.map((id) =>
      AppGraph.waitFor(graph, id).pipe(
        Effect.timeoutOrElse({ duration: `${timeoutMs} millis`, orElse: () => Effect.void }),
      ),
    ),
    { concurrency: 'unbounded', discard: true },
  );

/** The first openable child of `id` once the graph has one, or `undefined` after `timeoutMs`. */
export const firstOpenableChild = (
  registry: Registry.AtomRegistry,
  graph: AppGraph.ExpandableGraph,
  id: string,
  timeoutMs: number,
): Effect.Effect<string | undefined> =>
  Effect.callback<string>((resume) => {
    const settle = () => {
      const [first] = openableChildren(graph, id);
      if (first) {
        unsubscribe();
        resume(Effect.succeed(first));
      }
    };
    const unsubscribe = registry.subscribe(graph.connections(id, 'child'), settle);
    // Checked after subscribing, so a child that arrived in between is not missed.
    settle();
    return Effect.sync(() => unsubscribe());
  }).pipe(
    Effect.timeoutOrElse({
      duration: `${timeoutMs} millis`,
      orElse: () => Effect.succeed<string | undefined>(undefined),
    }),
  );
