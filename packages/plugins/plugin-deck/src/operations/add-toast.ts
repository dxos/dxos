//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities } from '../types';
import { upsertToast } from '../util';

const handler: Operation.WithHandler<typeof LayoutOperation.AddToast> = LayoutOperation.AddToast.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
        ...state,
        toasts: upsertToast(state.toasts, input as LayoutOperation.Toast),
      }));
    }),
  ),
);

export default handler;
