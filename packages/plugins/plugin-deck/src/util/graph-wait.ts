//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import type * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { log } from '@dxos/log';

import { openableChildren } from './openable-children.ts';

/**
 * The graph settles asynchronously — a released subtree returns when its connectors run again, and a
 * cold one when its source loads — so a caller waits on the atom that changes when it might have.
 * Undefined when the wait times out.
 */
const awaitAtom = <T>(
  registry: Registry.AtomRegistry,
  atom: Atom.Atom<T>,
  settled: (value: T) => boolean,
  timeoutMs: number,
): Effect.Effect<T | undefined> =>
  Effect.callback<T | undefined>((resume) => {
    const current = registry.get(atom);
    if (settled(current)) {
      resume(Effect.succeed(current));
      return;
    }

    const unsubscribe = registry.subscribe(atom, (value) => {
      if (settled(value)) {
        resume(Effect.succeed(value));
      }
    });
    return Effect.sync(unsubscribe);
  }).pipe(Effect.timeoutOrElse({ duration: `${timeoutMs} millis`, orElse: () => Effect.succeed(undefined) }));

/**
 * Waits for `ids` a retention change released to be back in the graph, so a caller's reads resolve them.
 * Expanding only starts the rebuild — connector output lands on a flush, and a path rebuilds a level per
 * round — so awaiting one flush would not tell a caller the subjects had returned. Ids that were never
 * released are not waited on at all, which is what keeps a stale or bogus one from costing the timeout.
 */
export const awaitReleaseSettled = (
  registry: Registry.AtomRegistry,
  builder: AppGraphBuilder.GraphBuilder,
  ids: readonly string[],
  timeoutMs: number,
): Effect.Effect<void> => {
  const pending = () => ids.filter((id) => AppGraphBuilder.wasReleased(builder, id));
  return awaitAtom(registry, AppGraphBuilder.releasedVersion(builder), () => pending().length === 0, timeoutMs).pipe(
    Effect.flatMap((settled) =>
      settled === undefined
        ? Effect.sync(() => log.warn('released subjects did not return', { ids: pending() }))
        : Effect.void,
    ),
  );
};

/** The first child of `id` a plank can open, once the graph has one. */
export const firstOpenableChild = (
  registry: Registry.AtomRegistry,
  graph: AppGraph.ExpandableGraph,
  id: string,
  timeoutMs: number,
): Effect.Effect<string | undefined> =>
  awaitAtom(registry, graph.connections(id, 'child'), () => openableChildren(graph, id).length > 0, timeoutMs).pipe(
    Effect.map(() => openableChildren(graph, id)[0]),
  );
