//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { DeckCapabilities } from '../types';

export default LayoutOperation.AddToast.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
        ...state,
        toasts: [...state.toasts, input as LayoutOperation.Toast],
      }));
    }),
  ),
);
