//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { updateState } from './update-state';

const handler: Operation.WithHandler<typeof LayoutOperation.AddToast> = LayoutOperation.AddToast.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* updateState((state) => ({
        toasts: [...state.toasts, input as LayoutOperation.Toast],
      }));
    }),
  ),
);

export default handler;
