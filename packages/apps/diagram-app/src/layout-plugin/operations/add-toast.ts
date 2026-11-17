//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { updateState } from './update-state.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.AddToast> = LayoutOperation.AddToast.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (toast) {
      // A toast reissued under its id replaces the one showing.
      yield* updateState(({ toasts }) => ({
        toasts: [...toasts.filter(({ id }) => id !== toast.id), toast as LayoutOperation.Toast],
      }));
    }),
  ),
);

export default handler;
