//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { DeckCapabilities } from '../types';
import { UpdatePlankSize } from './definitions';
import { updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof UpdatePlankSize> = UpdatePlankSize.pipe(
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
