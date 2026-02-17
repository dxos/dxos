//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type OperationInvoker } from '@dxos/operation';

import { Capabilities } from '../../common';
import { Capability } from '../../core';

import * as HistoryTracker from './history-tracker';
import * as UndoRegistry from './undo-registry';

//
// Capability Module - contributes both UndoRegistry and HistoryTracker.
//

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get the context for synchronous access in callbacks.
    const capabilities = yield* Capability.Service;

    // Create UndoRegistry.
    const undoRegistry = UndoRegistry.make(() => capabilities.getAll(Capabilities.UndoMapping).flat());

    // Create HistoryTracker (depends on UndoRegistry and OperationInvoker).
    const invoker = yield* Capability.get(Capabilities.OperationInvoker);
    // Cast to internal type - the factory always returns OperationInvokerInternal.
    const historyTracker = HistoryTracker.make(invoker as OperationInvoker.OperationInvokerInternal, undoRegistry);

    return [
      Capability.contributes(Capabilities.UndoRegistry, undoRegistry),
      Capability.contributes(Capabilities.HistoryTracker, historyTracker),
    ];
  }),
);
