//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import type * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { log } from '@dxos/log';

import { openableChildren } from './openable-children.ts';

/** Waits out the re-expansion of `ids` that a retention change released, so callers resolve the rebuilt nodes. */
export const awaitReleaseSettled = (
  registry: Registry.AtomRegistry,
  builder: AppGraphBuilder.GraphBuilder,
  ids: readonly string[],
  timeoutMs: number,
): Effect.Effect<void> => {
  const pending = () => ids.filter((id) => AppGraphBuilder.wasReleased(builder, id));
  return Effect.callback<void>((resume) => {
    if (pending().length === 0) {
      resume(Effect.void);
      return;
    }

    const unsubscribe = registry.subscribe(AppGraphBuilder.releasedVersion(builder), () => {
      if (pending().length === 0) {
        resume(Effect.void);
      }
    });
    return Effect.sync(unsubscribe);
  }).pipe(
    Effect.timeoutOrElse({
      duration: `${timeoutMs} millis`,
      orElse: () => Effect.sync(() => log.warn('released subjects did not return', { ids: pending() })),
    }),
  );
};

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
  }).pipe(
    Effect.timeoutOrElse({
      duration: `${timeoutMs} millis`,
      orElse: () => Effect.succeed<string | undefined>(undefined),
    }),
  );
