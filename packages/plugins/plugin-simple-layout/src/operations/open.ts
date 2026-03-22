// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { layoutStateAccess } from './state-access';

const handler: Operation.WithHandler<typeof LayoutOperation.Open> = LayoutOperation.Open.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { updateState } = yield* layoutStateAccess;
      const id = input.subject[0];

      updateState((state) => {
        const newHistory = state.active ? [...state.history, state.active] : state.history;
        const trimmedHistory =
          newHistory.length > MAX_HISTORY_LENGTH ? newHistory.slice(-MAX_HISTORY_LENGTH) : newHistory;
        return {
          ...state,
          active: id,
          history: trimmedHistory,
        };
      });
    }),
  ),
);

export default handler;

const MAX_HISTORY_LENGTH = 50;
