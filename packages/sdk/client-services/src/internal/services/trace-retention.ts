//
// Copyright 2026 DXOS.org
//

import * as Trace from '@dxos/compute/Trace';
import { type FeedRetentionPolicy } from '@dxos/echo-host';
import { FeedProtocol } from '@dxos/protocols';

/** How long the local trace feed keeps operation start/end messages. */
export const TRACE_OPERATION_RETENTION_MS = 7 * 24 * 60 * 60_000;

/**
 * Operation start/end pairs are most of a trace feed by volume and are only read to draw recent
 * activity; every other event (task status, questions, delegations) is the durable record of what an
 * agent did, so a message carrying one is kept.
 */
const PRUNABLE_EVENT_TYPES: ReadonlySet<string> = new Set([Trace.OperationStart.key, Trace.OperationEnd.key]);

/** Whether a decoded trace message carries nothing but prunable events. */
export const isPrunableTraceMessage = (object: Record<string, unknown>): boolean => {
  const events = object.events;
  return (
    Array.isArray(events) &&
    events.length > 0 &&
    events.every(
      (event: unknown) =>
        typeof event === 'object' &&
        event !== null &&
        'type' in event &&
        typeof event.type === 'string' &&
        PRUNABLE_EVENT_TYPES.has(event.type),
    )
  );
};

/** Retention for the space trace feed, applied by the local ECHO host. */
export const traceFeedRetention: FeedRetentionPolicy = {
  feedNamespace: FeedProtocol.WellKnownNamespaces.trace,
  maxAgeMs: TRACE_OPERATION_RETENTION_MS,
  shouldPrune: isPrunableTraceMessage,
};
