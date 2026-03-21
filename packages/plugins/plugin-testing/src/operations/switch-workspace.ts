//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { updateState } from './update-state';

export default LayoutOperation.SwitchWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject }) {
      yield* updateState(() => ({ workspace: subject }));
    }),
  ),
);
