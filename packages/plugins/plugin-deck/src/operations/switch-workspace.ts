//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { DeckCapabilities } from '#types';

import { RESOLVE_TIMEOUT_MS, applyWorkspace, navigateDeck } from '../url/index.ts';
import { openableChildren } from '../util/index.ts';

/** The first openable child of `id` once the graph has one, or `undefined` past the resolve timeout. */
const firstOpenableChild = (registry: Registry.AtomRegistry, graph: AppGraph.ExpandableGraph, id: string) =>
  Effect.callback<string>((resume) => {
    const unsubscribe = registry.subscribe(graph.connections(id, 'child'), () => {
      const [first] = openableChildren(graph, id);
      if (first) {
        unsubscribe();
        resume(Effect.succeed(first));
      }
    });
    // Checked after subscribing, so a child that arrived in between is not missed.
    const [first] = openableChildren(graph, id);
    if (first) {
      unsubscribe();
      resume(Effect.succeed(first));
    }

    return Effect.sync(() => unsubscribe());
  }).pipe(
    Effect.timeoutOrElse({ duration: RESOLVE_TIMEOUT_MS, orElse: () => Effect.succeed<string | undefined>(undefined) }),
  );

/** Opens the workspace's first child once its connectors produce one, if nothing was opened meanwhile. */
const seedWhenLoaded = Effect.fnUntraced(function* (graph: AppGraph.ExpandableGraph, workspace: string) {
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const first = yield* firstOpenableChild(registry, graph, workspace);
  const { activeDeck } = yield* Capabilities.getAtomValue(DeckCapabilities.State);
  const deck = yield* DeckCapabilities.getDeck();
  if (first && activeDeck === workspace && deck.active.length === 0) {
    yield* Operation.invoke(LayoutOperation.Open, { subject: [first] });
  }
});

const handler: Operation.WithHandler<typeof LayoutOperation.SwitchWorkspace> = LayoutOperation.SwitchWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const builder = yield* Capability.get(AppCapabilities.AppGraph);
      const { graph } = builder;
      const platform = yield* Capability.get(DeckCapabilities.Platform).pipe(
        Effect.catch(() => Effect.succeed('desktop' as const)),
      );

      yield* applyWorkspace(input.subject);

      const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
      const deck = state.decks[input.subject];
      invariant(deck, `Deck not found: ${input.subject}`);
      // What a workspace had open is remembered for the session but never persisted, so a reload
      // arrives here with nothing and the workspace seeds itself again.
      const { open } = yield* Capabilities.getAtomValue(DeckCapabilities.EphemeralState);
      const remembered = open[input.subject]?.active ?? [];

      // Seeding reads children, which an unloaded workspace only has once its expansion flushes.
      const seeds = remembered.length === 0 && platform !== 'mobile';
      if (seeds) {
        AppGraph.expandSync(graph, input.subject, 'child');
        yield* Effect.promise(() => AppGraphBuilder.flush(builder));
      }
      const seeded = seeds ? openableChildren(graph, input.subject).slice(0, 1) : [];
      if (seeds && seeded.length === 0) {
        yield* Effect.forkDetach(
          seedWhenLoaded(graph, input.subject).pipe(
            Effect.catchCause((cause) => Effect.sync(() => log.warn('seeding the workspace failed', { cause }))),
          ),
        );
      }
      const active = remembered.length > 0 ? remembered : seeded;

      const workspace = GraphPath.getWorkspaceToken(input.subject);
      if (workspace) {
        yield* navigateDeck({ workspace, active, companionPlanks: deck.companionPlanks });
      }

      const first = active[0];
      if (first) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: first });
      }
    }),
  ),
);

export default handler;
