// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { isPinnedWorkspace, LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { layoutStateAccess } from './state-access';

export default LayoutOperation.SwitchWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { updateState } = yield* layoutStateAccess;

      updateState((state) => ({
        ...state,
        previousWorkspace: !isPinnedWorkspace(state.workspace) ? state.workspace : state.previousWorkspace,
        workspace: input.subject,
        active: undefined,
        history: [],
      }));
    }),
  ),
);
