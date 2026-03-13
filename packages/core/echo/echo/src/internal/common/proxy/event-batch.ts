//
// Copyright 2024 DXOS.org
//

import { EventId } from './symbols';

/**
 * Simple batching mechanism for EventId emissions.
 * When batch depth > 0, events are collected instead of emitted immediately.
 * When batch depth returns to 0, pending events are emitted.
 */
let eventBatchDepth = 0;
const pendingEventTargets = new Set<object>();

/**
 * Run a callback in a batched context for EventId emissions.
 * Multiple mutations within the batch will only emit one event per target.
 */
export const batchEvents = (callback: () => void): void => {
  eventBatchDepth++;
  try {
    callback();
  } finally {
    eventBatchDepth--;
    if (eventBatchDepth === 0) {
      // Emit pending events.
      for (const target of pendingEventTargets) {
        (target as any)[EventId]?.emit();
      }
      pendingEventTargets.clear();
    }
  }
};

/**
 * Emit an event on a target, respecting batching.
 */
export const emitEvent = (target: object): void => {
  if (eventBatchDepth > 0) {
    pendingEventTargets.add(target);
  } else {
    (target as any)[EventId]?.emit();
  }
};
