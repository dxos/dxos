//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { UndoOperation } from '../../common';
import { Capabilities } from '../../common';
import { Capability } from '../../core';
import * as HistoryTracker from './history-tracker';
import * as UndoRegistry from './undo-registry';

//
// Capability Module - contributes UndoRegistry, HistoryTracker, and a
// {@link Capabilities.TraceSink} that feeds operation traces into the
// tracker.
//

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const invoker = yield* Capability.get(Capabilities.OperationInvoker);

    const undoRegistry = UndoRegistry.make(() => capabilities.getAll(Capabilities.UndoMapping).flat());

    const historyTracker = HistoryTracker.make({
      undoRegistry,
      invoker: {
        invokeInverse: (inverse, inverseInput) =>
          invoker.invoke(inverse, inverseInput).pipe(Effect.mapError((err) => err as Error)),
        invokeShowUndo: (message) => {
          if (message === undefined) {
            return;
          }
          Effect.runFork(invoker.invoke(UndoOperation.ShowUndo, { message }));
        },
      },
    });

    return [
      Capability.contributes(Capabilities.UndoRegistry, undoRegistry),
      Capability.contributes(Capabilities.HistoryTracker, historyTracker),
      Capability.contributes(Capabilities.TraceSink, () => historyTracker.traceSink),
    ];
  }),
);
