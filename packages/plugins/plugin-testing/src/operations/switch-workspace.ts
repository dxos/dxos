//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { updateState } from './update-state.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.SwitchWorkspace> = LayoutOperation.SwitchWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject }) {
      yield* updateState(() => ({ workspace: subject }));
    }),
  ),
);

export default handler;
