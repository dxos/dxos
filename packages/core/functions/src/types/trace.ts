//
// Copyright 2025 DXOS.org
//

import { EchoObject, Expando, ObjectId, Ref, S } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { FunctionTrigger, type FunctionTriggerType } from './types';

export enum InvocationOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export enum InvocationTraceEventType {
  START = 'start',
  END = 'end',
}

export const TraceEventException = S.Struct({
  timestampMs: S.Number,
  message: S.String,
  name: S.String,
  stack: S.optional(S.String),
});
export type TraceEventException = S.Schema.Type<typeof TraceEventException>;

export const InvocationTraceStartEvent = S.Struct({
  /**
   * Queue message id.
   */
  id: ObjectId,
  type: S.Literal(InvocationTraceEventType.START),
  /**
   * Invocation id, the same for invocation start and end events.
   */
  invocationId: ObjectId,
  /**
   * Event generation time.
   */
  timestampMs: S.Number,
  /**
   * Data passed to function / workflow as an argument.
   */
  input: S.Object,
  /**
   * Queue DXN for function/workflow invocation events.
   */
  invocationTraceQueue: Ref(Expando),
  /**
   * DXN of the invoked function/workflow.
   */
  invocationTarget: Ref(Expando),
  /**
   * Present for automatic invocations.
   */
  trigger: S.optional(Ref(FunctionTrigger)),
}).pipe(EchoObject('dxos.org/type/InvocationTraceStart', '0.1.0'));

export type InvocationTraceStartEvent = S.Schema.Type<typeof InvocationTraceStartEvent>;

export const InvocationTraceEndEvent = S.Struct({
  /**
   * Trace event id.
   */
  id: ObjectId,
  type: S.Literal(InvocationTraceEventType.END),
  /**
   * Invocation id, will be the same for invocation start and end.
   */
  invocationId: ObjectId,
  /**
   * Event generation time.
   */
  timestampMs: S.Number,
  outcome: S.Enums(InvocationOutcome),
  exception: S.optional(TraceEventException),
}).pipe(EchoObject('dxos.org/type/InvocationTraceEnd', '0.1.0'));

export type InvocationTraceEndEvent = S.Schema.Type<typeof InvocationTraceEndEvent>;

export type InvocationTraceEvent = InvocationTraceStartEvent | InvocationTraceEndEvent;

export const TraceEventLog = S.Struct({
  timestampMs: S.Number,
  level: S.String,
  message: S.String,
  context: S.optional(S.Object),
});

export const TraceEvent = S.Struct({
  id: ObjectId,
  outcome: S.String,
  truncated: S.Boolean,
  /**
   * Time when the event was persisted.
   */
  ingestionTimestampMs: S.Number,
  logs: S.Array(TraceEventLog),
  exceptions: S.Array(TraceEventException),
}).pipe(EchoObject('dxos.org/type/TraceEvent', '0.1.0'));

export type TraceEvent = S.Schema.Type<typeof TraceEvent>;

/**
 * TODO: remove
 * Deprecated InvocationTrace event format.
 */
export type InvocationSpan = {
  id: string;
  timestampMs: number;
  outcome: InvocationOutcome | 'in-progress';
  input: object;
  durationMs: number;
  invocationTraceQueue: Ref<Expando>;
  invocationTarget: Ref<Expando>;
  trigger?: Ref<FunctionTriggerType>;
  exception?: TraceEventException;
};

export const createInvocationSpans = (items?: InvocationTraceEvent[]): InvocationSpan[] => {
  if (!items) {
    return [];
  }

  const eventsByInvocationId = new Map<string, { start?: InvocationTraceStartEvent; end?: InvocationTraceEndEvent }>();
  for (const event of items) {
    if (!('invocationId' in event)) {
      // Skip legacy format entries.
      continue;
    }

    const invocationId = event.invocationId;
    const entry = eventsByInvocationId.get(invocationId) || { start: undefined, end: undefined };

    if (event.type === InvocationTraceEventType.START) {
      entry.start = event as InvocationTraceStartEvent;
    } else if (event.type === InvocationTraceEventType.END) {
      entry.end = event as InvocationTraceEndEvent;
    }

    eventsByInvocationId.set(invocationId, entry);
  }

  const now = Date.now();
  const result: InvocationSpan[] = [];

  // Create spans for each invocation
  for (const [invocationId, { start, end }] of eventsByInvocationId.entries()) {
    if (!start) {
      // No start event, can't create a meaningful span
      log.warn('Found end event without matching start', { invocationId });
      continue;
    }

    const isInProgress = end === undefined;

    result.push({
      id: invocationId,
      timestampMs: start.timestampMs,
      durationMs: isInProgress ? now - start.timestampMs : end!.timestampMs - start.timestampMs,
      outcome: end?.outcome ?? ('in-progress' as const),
      exception: end?.exception,
      input: start.input,
      invocationTraceQueue: start.invocationTraceQueue,
      invocationTarget: start.invocationTarget,
      trigger: start.trigger,
    });
  }

  return result;
};
