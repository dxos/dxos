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
import { firstOpenableChild, openableChildren, withViewTransition } from '../util/index.ts';

/**
 * The workspace's last URL, if it had planks. It is remembered for the session but never persisted, so a
 * first visit or a reload finds none.
 */
const lastUrl = (builder: AppCapabilities.AppGraph, url: string | undefined): Option.Option<Navigation.Navigation> =>
  Option.fromNullishOr(url).pipe(
    Option.flatMap((pathname) => Navigation.parse(pathname, PathResolution.buildUrlKeyTable(builder))),
    Option.filter(({ pairs }) => pairs.length > 0),
  );

/** Opens the workspace's first child once its children arrive, unless the deck has moved on by then. */
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
    // Replaces the empty entry, so Back does not land on a workspace showing nothing. The plank takes its
    // focus intent in the same write, which an empty deck gaining one always makes.
    yield* navigateDeck({
      workspace,
      active: [first],
      companionPlanks: deck.companionPlanks,
      method: 'replace',
      intent: { scrollIntoView: first },
    });
  }
});

/**
 * Opens the workspace's first openable child, returning it and whether the navigation wrote. Connector
 * output lands on a flush, so waiting for one seeds a workspace whose children are ready in a single
 * navigation; the rest seed once they load.
 */
const seedWorkspace = Effect.fnUntraced(function* (
  builder: AppCapabilities.AppGraph,
  subject: string,
  workspace: string,
  companionPlanks: readonly string[] | undefined,
) {
  AppGraph.expandSync(builder.graph, subject, 'child');
  yield* Effect.promise(() => AppGraphBuilder.flush(builder));
  const [first] = openableChildren(builder.graph, subject);
  const wrote = yield* navigateDeck({
    workspace,
    active: first ? [first] : [],
    companionPlanks,
    intent: { scrollIntoView: first },
  });
  if (!first) {
    // Detached: a later switch leaves this one to find the deck already moved on.
    yield* Effect.forkDetach(
      seedWhenLoaded(builder.graph, subject, workspace).pipe(
        Effect.catchCause((cause) => Effect.sync(() => log.warn('seeding the workspace failed', { cause }))),
      ),
    );
  }
  return { first, wrote };
});

const handler: Operation.WithHandler<typeof LayoutOperation.SwitchWorkspace> = LayoutOperation.SwitchWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const builder = yield* Capability.get(AppCapabilities.AppGraph);
      const platform = yield* Capability.get(DeckCapabilities.Platform).pipe(
        Effect.catch(() => Effect.succeed('desktop' as const)),
      );

      const { activeDeck } = yield* Capabilities.getAtomValue(DeckCapabilities.State);
      const entering = activeDeck !== input.subject;
      yield* entering ? withViewTransition(applyWorkspace(input.subject)) : applyWorkspace(input.subject);
      const workspace = GraphPath.getWorkspaceToken(input.subject);
      if (!workspace) {
        return;
      }

      const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
      const deck = state.decks[input.subject];
      invariant(deck, `Deck not found: ${input.subject}`);
      const { open } = yield* Capabilities.getAtomValue(DeckCapabilities.EphemeralState);
      const restored = lastUrl(builder, open[input.subject]?.url);

      let first: string | undefined;
      let wrote = false;
      if (Option.isSome(restored)) {
        // Through the projection a reload uses, which shows the planks while they rebuild and turns any
        // that no longer exist into not-found.
        first = open[input.subject]?.active[0];
        wrote = yield* navigate(restored.value, { intent: { scrollIntoView: first } });
      } else if (platform === 'mobile') {
        yield* navigateDeck({ workspace, active: [], companionPlanks: deck.companionPlanks });
      } else {
        ({ first, wrote } = yield* seedWorkspace(builder, input.subject, workspace, deck.companionPlanks));
      }

      // The first plank takes its focus intent in the write above, so it never paints unattended. A
      // workspace the URL already names writes nothing, leaving the intent undelivered.
      if (first && !wrote) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: first });
      }
    }),
  ),
);

export default handler;
