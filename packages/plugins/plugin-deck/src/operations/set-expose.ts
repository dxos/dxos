//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities, DeckOperation } from '#types';

const handler: Operation.WithHandler<typeof DeckOperation.SetExpose> = DeckOperation.SetExpose.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
        ...state,
        expose: input.expose,
      }));
    }),
  ),
);

export default handler;
