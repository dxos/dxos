// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

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
