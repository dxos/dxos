//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import * as AppGraph from '@dxos/app-graph/AppGraph';

import { openableChildren } from './openable-children.ts';

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

export const firstOpenableChild = (
  registry: Registry.AtomRegistry,
  graph: AppGraph.ExpandableGraph,
  id: string,
  timeoutMs: number,
): Effect.Effect<string | undefined> =>
  Effect.callback<string>((resume) => {
    let found = false;
    let unsubscribe: (() => void) | undefined;
    unsubscribe = registry.subscribe(
      graph.connections(id, 'child'),
      () => {
        const [first] = openableChildren(graph, id);
        if (first && !found) {
          found = true;
          unsubscribe?.();
          resume(Effect.succeed(first));
        }
      },
      { immediate: true },
    );
    if (found) {
      unsubscribe();
    }

    return Effect.sync(() => unsubscribe?.());
  }).pipe(
    Effect.timeoutOrElse({
      duration: `${timeoutMs} millis`,
      orElse: () => Effect.succeed<string | undefined>(undefined),
    }),
  );
