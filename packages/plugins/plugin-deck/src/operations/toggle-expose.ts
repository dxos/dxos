//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { DeckCapabilities, DeckOperation } from '../types';

const handler: Operation.WithHandler<typeof DeckOperation.ToggleExpose> = DeckOperation.ToggleExpose.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
        ...state,
        expose: input.expose ?? !state.expose,
      }));
    }),
  ),
);

export default handler;
