//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Common from '../../common';
import { Capability } from '../../core';

import * as HistoryTracker from './history-tracker';
import * as UndoRegistry from './undo-registry';

//
// Capability Module - contributes both UndoRegistry and HistoryTracker.
//

export default Capability.makeModule((context: Capability.PluginContext) =>
  Effect.gen(function* () {
    // Create UndoRegistry.
    const undoRegistry = UndoRegistry.make(() => context.getCapabilities(Common.Capability.UndoMapping).flat());

    // Create HistoryTracker (depends on UndoRegistry and OperationInvoker).
    const invoker = context.getCapability(Common.Capability.OperationInvoker);
    const historyTracker = HistoryTracker.make(invoker, undoRegistry);

    return Effect.succeed([
      Capability.contributes(Common.Capability.UndoRegistry, undoRegistry),
      Capability.contributes(Common.Capability.HistoryTracker, historyTracker),
    ]);
  }).pipe(Effect.flatten),
);
