//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as FiberHandle from 'effect/FiberHandle';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { DeckCapabilities } from '#types';

import { RESOLVE_TIMEOUT_MS, applyWorkspace, navigateDeck } from '../url/index.ts';
import { firstOpenableChild, openableChildren } from '../util/index.ts';

const replaceEmptyDeck = (params: Omit<Parameters<typeof navigateDeck>[0], 'method'>) =>
  navigateDeck({ ...params, method: 'replace' });

const seedWhenLoaded = Effect.fnUntraced(function* (
  graph: AppGraph.ExpandableGraph,
  subject: string,
  workspace: string,
) {
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const first = yield* firstOpenableChild(registry, graph, subject, RESOLVE_TIMEOUT_MS);
  const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
  const deck = yield* DeckCapabilities.getDeck();
  if (first && state.activeDeck === subject && deck.active.length === 0) {
    yield* replaceEmptyDeck({ workspace, active: [first], companionPlanks: deck.companionPlanks });
    yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: first });
  }
});

const handler: Operation.WithHandler<typeof LayoutOperation.SwitchWorkspace> = LayoutOperation.SwitchWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const platform = yield* Capability.get(DeckCapabilities.Platform).pipe(
        Effect.catch(() => Effect.succeed('desktop' as const)),
      );
      const seed = yield* Capability.get(DeckCapabilities.WorkspaceSeed);
      yield* FiberHandle.clear(seed);

      yield* applyWorkspace(input.subject);

      const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
      const deck = state.decks[input.subject];
      invariant(deck, `Deck not found: ${input.subject}`);
      // What a workspace had open is remembered for the session but never persisted, so a reload
      // arrives here with nothing and the workspace seeds itself again.
      const { open } = yield* Capabilities.getAtomValue(DeckCapabilities.EphemeralState);
      const remembered = open[input.subject]?.active ?? [];

      const workspace = GraphPath.getWorkspaceToken(input.subject);
      if (!workspace) {
        return;
      }

      const seeds = remembered.length === 0 && platform !== 'mobile';
      if (seeds) {
        AppGraph.expandSync(graph, input.subject, 'child');
      }
      const seeded = seeds ? openableChildren(graph, input.subject).slice(0, 1) : [];
      const active = remembered.length > 0 ? remembered : seeded;
      yield* navigateDeck({ workspace, active, companionPlanks: deck.companionPlanks });

      if (seeds && seeded.length === 0) {
        yield* FiberHandle.run(
          seed,
          seedWhenLoaded(graph, input.subject, workspace).pipe(
            Effect.catchCause((cause) =>
              Cause.hasInterruptsOnly(cause)
                ? Effect.void
                : Effect.sync(() => log.warn('seeding the workspace failed', { cause })),
            ),
          ),
        );
      }

      const first = active[0];
      if (first) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: first });
      }
    }),
  ),
);

export default handler;
