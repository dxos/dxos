//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';

/**
 * A node's graph children that can be opened as planks, in graph order.
 *
 * Excludes actions and nodes carrying a `disposition`, which address a surface (a companion, a settings
 * panel) rather than something the deck can hold.
 */
export const openableChildren = (graph: AppGraph.ExpandableGraph, id: string): string[] =>
  AppGraph.getConnections(graph, id, 'child')
    .filter((node) => !AppGraphNode.isActionLike(node) && !node.properties.disposition)
    .map((node) => node.id);

/** The first child of `id` a plank can open, or undefined if none arrives in time. */
export const firstOpenableChild = (
  registry: Registry.AtomRegistry,
  graph: AppGraph.ExpandableGraph,
  id: string,
  timeoutMs: number,
): Effect.Effect<string | undefined> =>
  Effect.callback<string>((resume) => {
    const unsubscribe = registry.subscribe(
      graph.connections(id, 'child'),
      () => {
        const [first] = openableChildren(graph, id);
        if (first) {
          resume(Effect.succeed(first));
        }
      },
      { immediate: true },
    );
    return Effect.sync(unsubscribe);
  }).pipe(Effect.timeoutOrElse({ duration: `${timeoutMs} millis`, orElse: () => Effect.succeed(undefined) }));
