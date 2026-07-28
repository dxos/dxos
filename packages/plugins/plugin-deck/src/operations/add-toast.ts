//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

import { DeckCapabilities } from '../types';

const handler: Operation.WithHandler<typeof LayoutOperation.AddToast> = LayoutOperation.AddToast.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => {
        const toast = input as LayoutOperation.Toast;
        // `id` is the key the toaster renders by, so a repeat dispatch has to replace the live toast:
        // appending duplicates it on screen and collides the React key.
        const index = state.toasts.findIndex(({ id }) => id === toast.id);
        return {
          ...state,
          toasts:
            index === -1
              ? [...state.toasts, toast]
              : state.toasts.map((existing, current) => (current === index ? toast : existing)),
        };
      });
    }),
  ),
);

export default handler;
