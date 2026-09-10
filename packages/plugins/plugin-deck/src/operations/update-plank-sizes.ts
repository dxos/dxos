//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities, DeckOperation } from '#types';

import { Navigation } from '../url';
import { updateActiveDeck } from '../util';

const handler: Operation.WithHandler<typeof DeckOperation.UpdatePlankSizes> = DeckOperation.UpdatePlankSizes.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { segments } = yield* Capabilities.getAtomValue(DeckCapabilities.EphemeralState);
      const sizes = Object.fromEntries(
        Object.entries(input.sizes).map(([id, size]) => [Navigation.segmentOf(segments, id), size]),
      );
      yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
        updateActiveDeck(state, {
          plankSizing: { ...state.decks[state.activeDeck]?.plankSizing, ...sizes },
        }),
      );
    }),
  ),
);

export default handler;
