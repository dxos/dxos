//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type OperationInvoker } from '@dxos/operation';

import * as Common from '../../common';
import { Capability } from '../../core';

import * as HistoryTracker from './history-tracker';
import * as UndoRegistry from './undo-registry';

//
// Capability Module - contributes both UndoRegistry and HistoryTracker.
//

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get the context for synchronous access in callbacks.
    const context = yield* Capability.PluginContextService;

    // Create UndoRegistry.
    const undoRegistry = UndoRegistry.make(() => context.getCapabilities(Common.Capability.UndoMapping).flat());

    // Create HistoryTracker (depends on UndoRegistry and OperationInvoker).
    const invoker = yield* Capability.get(Common.Capability.OperationInvoker);
    // Cast to internal type - the factory always returns OperationInvokerInternal.
    const historyTracker = HistoryTracker.make(invoker as OperationInvoker.OperationInvokerInternal, undoRegistry);

    return [
      Capability.contributes(Common.Capability.UndoRegistry, undoRegistry),
      Capability.contributes(Common.Capability.HistoryTracker, historyTracker),
    ];
  }),
);
