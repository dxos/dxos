// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { layoutStateAccess } from './state-access';

const handler: Operation.WithHandler<typeof LayoutOperation.Close> = LayoutOperation.Close.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const { updateState } = yield* layoutStateAccess;

      updateState((state) => {
        if (state.history.length > 0) {
          const newHistory = [...state.history];
          const previousActive = newHistory.pop();
          return {
            ...state,
            active: previousActive,
            history: newHistory,
          };
        }
        return {
          ...state,
          active: undefined,
        };
      });
    }),
  ),
);

export default handler;
