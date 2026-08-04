//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';
import { Graph, Node } from '@dxos/plugin-graph';

import { DeckCapabilities } from '../types';
import * as DeckSchema from '../types/DeckSchema';

const handler: Operation.WithHandler<typeof LayoutOperation.SwitchWorkspace> = LayoutOperation.SwitchWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);

      {
        const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
        // TODO(wittjosiah): This is a hack to prevent the previous deck from being set for pinned items.
        //   Ideally this should be worked into the data model in a generic way.
        const shouldUpdatePrevious = !GraphPath.isPinnedWorkspace(state.activeDeck);

        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => {
          const newDecks = state.decks[input.subject]
            ? state.decks
            : { ...state.decks, [input.subject]: { ...DeckSchema.defaultDeck } };
          return {
            ...state,
            previousDeck: shouldUpdatePrevious ? state.activeDeck : state.previousDeck,
            activeDeck: input.subject,
            decks: newDecks,
          };
        });

        // Fullscreen is transient and scoped to the workspace it was entered in.
        yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
          ...state,
          fullscreen: undefined,
        }));
      }

      {
        const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
        const deck = state.decks[input.subject];
        invariant(deck, `Deck not found: ${input.subject}`);

        const first = deck.active[0];
        if (first) {
          yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: first });
        } else {
          const [item] = Graph.getConnections(graph, input.subject, 'child').filter(
            (node) => !Node.isActionLike(node) && !node.properties.disposition,
          );
          if (item) {
            // Use `invoke` (synchronous) rather than `schedule` (fire-and-forget) so
            // that the implicit "open first child" finishes BEFORE this handler
            // returns. Otherwise, a caller that follows `SwitchWorkspace` with its
            // own `Open` (e.g. WelcomePlugin DefaultContent) has its `active`
            // clobbered by this scheduled Open when it later races behind the
            // caller's state writes.
            yield* Operation.invoke(LayoutOperation.Open, { subject: [item.id] });
          }
        }
      }
    }),
  ),
);

export default handler;
