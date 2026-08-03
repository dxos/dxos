//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { AttentionCapabilities } from '@dxos/plugin-attention';

import { incrementPlank } from '../layout';
import { DeckCapabilities, DeckOperation } from '../types';
import { computeActiveUpdates } from '../util';
import { updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof DeckOperation.Adjust> = DeckOperation.Adjust.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const deck = yield* DeckCapabilities.getDeck();
      const attention = yield* Capability.get(AttentionCapabilities.Attention);

      if (input.type === 'increment-end' || input.type === 'increment-start') {
        const next = incrementPlank(deck.active, input);
        const { deckUpdates } = computeActiveUpdates({ next, deck, attention });
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => updateActiveDeck(state, deckUpdates));
      }

      if (input.type === 'expand') {
        // Transient like fullscreen, and deliberately not a `plankSizing` write: collapsing has to give
        // the plank back the width it had rather than the width the deck happened to expand it to.
        const expanding = deck.active.includes(input.id);
        yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
          ...state,
          expanded: state.expanded === input.id ? undefined : input.id,
        }));
        if (expanding) {
          // An expanded plank is sized to the space *between* the two spine piles, which is only where
          // it sits once it is at the front. Left where it was, its trailing edge — and with it the
          // whole toolbar button group — ends up underneath the following planks' spines.
          yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: input.id });
        }
      }

      if (input.type === 'fullscreen') {
        // Fullscreen is a transient overlay, independent of `active`: toggle it on/off for this plank.
        yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
          ...state,
          fullscreen: state.fullscreen === input.id ? undefined : input.id,
        }));
      }
    }),
  ),
);

export default handler;
