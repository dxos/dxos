//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities, DeckOperation } from '#types';

import { updateActiveDeck } from './helpers.ts';

const handler: Operation.WithHandler<typeof DeckOperation.UpdatePlankSize> = DeckOperation.UpdatePlankSize.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
        updateActiveDeck(state, {
          plankSizing: {
            ...state.decks[state.activeDeck]?.plankSizing,
            [input.id]: input.size,
          },
        }),
      );
    }),
  ),
);

export default handler;
