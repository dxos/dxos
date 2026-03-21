// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { layoutStateAccess } from './state-access';

const handler: Operation.WithHandler<typeof LayoutOperation.Set> = LayoutOperation.Set.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { updateState } = yield* layoutStateAccess;

      updateState((state) => ({
        ...state,
        active: input.subject[0],
      }));
    }),
  ),
);

export default handler;
