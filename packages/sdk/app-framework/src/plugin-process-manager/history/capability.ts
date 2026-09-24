//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { OperationInvoker } from '@dxos/operation';

import { Capabilities } from '../../common/index.ts';
import { Capability } from '../../core/index.ts';
import * as HistoryTracker from './history-tracker.ts';
import * as UndoRegistry from './undo-registry.ts';

//
// Capability Module - contributes both UndoRegistry and HistoryTracker.
//

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Create UndoRegistry over the live mapping contributions (synchronous access in callbacks).
    const undoMappings = yield* Capabilities.UndoMapping;
    const undoRegistry = UndoRegistry.make(() => undoMappings.get().flat());

    // Create HistoryTracker (depends on UndoRegistry and OperationInvoker).
    const invoker = yield* Capabilities.OperationInvoker;
    // Cast to internal type - the factory always returns OperationInvokerInternal.
    const historyTracker = HistoryTracker.make(invoker as OperationInvoker.OperationInvokerInternal, undoRegistry);

    return [
      Capability.contribute(Capabilities.UndoRegistry, undoRegistry),
      Capability.contribute(Capabilities.HistoryTracker, historyTracker),
    ];
  }),
);
