//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities, DeckOperation } from '#types';

import { Navigation } from '../url/index.ts';
import { updateActiveDeck } from '../util/index.ts';

const handler: Operation.WithHandler<typeof DeckOperation.UpdatePlankSize> = DeckOperation.UpdatePlankSize.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { segments } = yield* DeckCapabilities.getDeck();
      const key = Navigation.segmentOf(segments, input.id);
      yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
        updateActiveDeck(state, {
          plankSizing: { ...state.decks[state.activeDeck]?.plankSizing, [key]: input.size },
        }),
      );
    }),
  ),
);

export default handler;
