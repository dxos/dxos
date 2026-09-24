//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { DebugOperation } from '#types';

import { NothingToUndoError } from '../errors.ts';

const handler: Operation.WithHandler<typeof DebugOperation.Undo> = DebugOperation.Undo.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const tracker = yield* Capability.get(Capabilities.HistoryTracker);
      if (!tracker.canUndo()) {
        return yield* Effect.fail(new NothingToUndoError());
      }
      yield* tracker.undo();
      return { undone: true };
    }),
  ),
);

export default handler;
