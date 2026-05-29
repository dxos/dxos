//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { OperationInvoker } from '@dxos/operation';

import { Capabilities } from '../../common';
import { Capability } from '../../core';
import * as HistoryTracker from './history-tracker';
import { resolveMessage } from './undo-mapping';
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

    // Create HistoryTracker (consumes undo info stamped onto invocation events).
    const invoker = yield* Capability.get(Capabilities.OperationInvoker);
    // Cast to internal type - the factory always returns OperationInvokerInternal.
    const internalInvoker = invoker as OperationInvoker.OperationInvokerInternal;
    const historyTracker = HistoryTracker.make(internalInvoker);

    // Stamp undo information onto successful invocation events via the registry. The single lookup here
    // feeds both the HistoryTracker (undo stack) and the deck notification tracker (undo toast).
    internalInvoker.setUndoResolver((operation, input, output) => {
      const mapping = undoRegistry.lookup(operation);
      if (!mapping) {
        return undefined;
      }
      const inverseInput = mapping.deriveContext(input, output);
      if (inverseInput === undefined) {
        return undefined;
      }
      return { message: resolveMessage(mapping.message, input, output), inverse: mapping.inverse, inverseInput };
    });

    return [
      Capability.contributes(Capabilities.UndoRegistry, undoRegistry),
      Capability.contributes(Capabilities.HistoryTracker, historyTracker),
    ];
  }),
);
