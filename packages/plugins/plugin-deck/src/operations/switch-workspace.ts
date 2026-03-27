//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, isPinnedWorkspace, LayoutOperation } from '@dxos/app-toolkit';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { Graph, Node } from '@dxos/plugin-graph';

import { DeckCapabilities, defaultDeck } from '../types';

const handler: Operation.WithHandler<typeof LayoutOperation.SwitchWorkspace> = LayoutOperation.SwitchWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);

      {
        const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
        // TODO(wittjosiah): This is a hack to prevent the previous deck from being set for pinned items.
        //   Ideally this should be worked into the data model in a generic way.
        const shouldUpdatePrevious = !isPinnedWorkspace(state.activeDeck);

        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => {
          const newDecks = state.decks[input.subject]
            ? state.decks
            : { ...state.decks, [input.subject]: { ...defaultDeck } };
          return {
            ...state,
            previousDeck: shouldUpdatePrevious ? state.activeDeck : state.previousDeck,
            activeDeck: input.subject,
            decks: newDecks,
          };
        });
      }

      {
        const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
        const deck = state.decks[input.subject];
        invariant(deck, `Deck not found: ${input.subject}`);

        const first = deck.solo ? deck.solo : deck.active[0];
        if (first) {
          yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: first });
        } else {
          const [item] = Graph.getConnections(graph, input.subject, 'child').filter(
            (node) => !Node.isActionLike(node) && !node.properties.disposition,
          );
          if (item) {
            yield* Operation.schedule(LayoutOperation.Open, { subject: [item.id] });
          }
        }
      }
    }),
  ),
);

export default handler;
