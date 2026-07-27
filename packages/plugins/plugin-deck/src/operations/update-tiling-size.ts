//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { DeckCapabilities, DeckOperation } from '../types';
import { updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof DeckOperation.UpdateTilingSize> = DeckOperation.UpdateTilingSize.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
        updateActiveDeck(state, { tilingSizing: [...input.weights] }),
      );
    }),
  ),
);

export default handler;
