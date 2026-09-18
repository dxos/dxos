//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { DeckCapabilities } from '#types';

import { Navigation, RESOLVE_TIMEOUT_MS, applyWorkspace, navigate, navigateDeck } from '../url/index.ts';
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

      const workspace = GraphPath.getWorkspaceToken(input.subject);
      if (!workspace) {
        return;
      }

      // Returning restores the workspace's last URL through the projection a reload uses, which shows its
      // planks while they rebuild and turns any that no longer exist into not-found.
      const restored = Option.fromNullishOr(open[input.subject]?.url).pipe(
        Option.flatMap((url) => Navigation.parse(url, PathResolution.buildUrlKeyTable(builder))),
        Option.filter(({ pairs }) => pairs.length > 0),
      );
      if (Option.isSome(restored)) {
        yield* navigate(restored.value);
        const [first] = remembered;
        if (first) {
          yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: first });
        }
        return;
      }

      const seeds = platform !== 'mobile';
      if (seeds) {
        // Connector output lands on a flush, so the switch waits for it and seeds in one navigation.
        AppGraph.expandSync(graph, input.subject, 'child');
        yield* Effect.promise(() => AppGraphBuilder.flush(builder));
      }
      const seeded = seeds ? openableChildren(graph, input.subject).slice(0, 1) : [];
      yield* navigateDeck({ workspace, active: seeded, companionPlanks: deck.companionPlanks });

      // Only a workspace whose children are still loading reaches here; its seed replaces the empty URL.
      if (seeds && seeded.length === 0) {
        // Detached: a later switch leaves this one to find the deck already moved on.
        yield* Effect.forkDetach(
          seedWhenLoaded(graph, input.subject, workspace).pipe(
            Effect.catchCause((cause) => Effect.sync(() => log.warn('seeding the workspace failed', { cause }))),
          ),
        );
      }

      const [first] = seeded;
      if (first) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: first });
      }
    }),
  ),
);

export default handler;
