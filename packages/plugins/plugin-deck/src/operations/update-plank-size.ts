//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { UpdatePlankSize } from './definitions';
import { updateActiveDeck } from './helpers';
import { DeckCapabilities } from '../types';

export default UpdatePlankSize.pipe(
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
