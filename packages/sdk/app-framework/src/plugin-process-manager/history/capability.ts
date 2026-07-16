//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { OperationInvoker } from '@dxos/operation';

import { Capabilities } from '../../common';
import { Capability } from '../../core';
import * as HistoryTracker from './history-tracker';
import * as UndoRegistry from './undo-registry';

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
      Capability.provide(Capabilities.UndoRegistry, undoRegistry),
      Capability.provide(Capabilities.HistoryTracker, historyTracker),
    ];
  }),
);
