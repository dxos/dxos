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

/** The first value of `atom` that satisfies `settled`, or undefined if none arrives in time. */
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
 * Waits for `ids` a retention released to return; a path rebuilds a level per flush, so one flush
 * proves nothing, and an id that was never released is never waited on.
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
