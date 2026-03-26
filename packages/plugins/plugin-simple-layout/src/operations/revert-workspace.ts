// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { layoutStateAccess } from './state-access';

const handler: Operation.WithHandler<typeof LayoutOperation.RevertWorkspace> = LayoutOperation.RevertWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const { getState } = yield* layoutStateAccess;
      const state = getState();
      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, {
        subject: state.previousWorkspace,
      });
    }),
  ),
);

export default handler;
