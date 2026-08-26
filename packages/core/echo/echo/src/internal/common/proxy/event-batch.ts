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
 * Emit the reactivity event on a single target, collecting a throwing listener's error rather than
 * letting it escape — `Event.emit` stops at the first throwing listener, so an escaping error would
 * also skip every target queued behind this one.
 */
export const emitEventTarget = (target: object, errors: unknown[]): void => {
  try {
    (target as any)[EventId]?.emit();
  } catch (err) {
    errors.push(err);
  }
};

/**
 * Emit the reactivity event on every queued target, clearing the queue first.
 *
 * Clearing before emitting is load-bearing: these queues are module-level, so they are GC roots —
 * a target left behind by a throwing listener would retain a live proxy, and the whole object graph
 * behind it, for the lifetime of the process, and the next batch would emit it again.
 */
export const drainEventTargets = (targets: Set<object>, errors: unknown[]): void => {
  if (targets.size === 0) {
    return;
  }

  const drained = Array.from(targets);
  targets.clear();
  for (const target of drained) {
    emitEventTarget(target, errors);
  }
};

/**
 * Surface listener errors once the whole queue has been emitted, aggregating so that one throwing
 * listener does not hide the rest.
 */
export const rethrowEmitErrors = (errors: unknown[]): void => {
  if (errors.length === 1) {
    throw errors[0];
  }
  if (errors.length > 1) {
    throw new AggregateError(errors, 'Reactivity listener(s) threw.');
  }
};

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
      const errors: unknown[] = [];
      drainEventTargets(pendingEventTargets, errors);
      rethrowEmitErrors(errors);
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
    const errors: unknown[] = [];
    emitEventTarget(target, errors);
    rethrowEmitErrors(errors);
  }
};
