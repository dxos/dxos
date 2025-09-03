//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type Ref, Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';
import { ObjectId } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { FunctionTrigger } from './types';

export enum InvocationOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending',
}

// TODO(burdon): Convert to extensible discriminated union of EDGE events.
export enum InvocationTraceEventType {
  START = 'start',
  END = 'end',
}

export const TraceEventException = Schema.Struct({
  timestampMs: Schema.Number,
  message: Schema.String,
  name: Schema.String,
  stack: Schema.optional(Schema.String),
});
export type TraceEventException = Schema.Schema.Type<typeof TraceEventException>;

export const InvocationTraceStartEvent = Schema.Struct({
  /**
   * Queue message id.
   */
  id: ObjectId,
  type: Schema.Literal(InvocationTraceEventType.START),
  /**
   * Invocation id, the same for invocation start and end events.
   */
  invocationId: ObjectId,
  /**
   * Event generation time.
   */
  timestampMs: Schema.Number,
  /**
   * Data passed to function / workflow as an argument.
   */
  // TODO(burdon): Input schema?
  input: Schema.Object,
  /**
   * Queue  for function/workflow invocation events.
   */
  invocationTraceQueue: Type.Ref(Queue),
  /**
   * DXN of the invoked function/workflow.
   */
  invocationTarget: Type.Ref(Type.Expando),
  /**
   * Present for automatic invocations.
   */
  trigger: Schema.optional(Type.Ref(FunctionTrigger)),
}).pipe(Type.Obj({ typename: 'dxos.org/type/InvocationTraceStart', version: '0.1.0' }));

export type InvocationTraceStartEvent = Schema.Schema.Type<typeof InvocationTraceStartEvent>;

export const InvocationTraceEndEvent = Schema.Struct({
  /**
   * Trace event id.
   */
  id: ObjectId,
  type: Schema.Literal(InvocationTraceEventType.END),
  /**
   * Invocation id, will be the same for invocation start and end.
   */
  invocationId: ObjectId,
  /**
   * Event generation time.
   */
  // TODO(burdon): Remove ms suffix.
  timestampMs: Schema.Number,
  outcome: Schema.Enums(InvocationOutcome),
  exception: Schema.optional(TraceEventException),
}).pipe(Type.Obj({ typename: 'dxos.org/type/InvocationTraceEnd', version: '0.1.0' }));

export type InvocationTraceEndEvent = Schema.Schema.Type<typeof InvocationTraceEndEvent>;

export type InvocationTraceEvent = InvocationTraceStartEvent | InvocationTraceEndEvent;

export const TraceEventLog = Schema.Struct({
  timestampMs: Schema.Number,
  level: Schema.String,
  message: Schema.String,
  context: Schema.optional(Schema.Object),
});

export const TraceEvent = Schema.Struct({
  id: ObjectId,
  // TODO(burdon): Need enum/numeric result (not string).
  outcome: Schema.String,
  truncated: Schema.Boolean,
  /** Time when the event was persisted. */
  ingestionTimestamp: Schema.Number,
  logs: Schema.Array(TraceEventLog),
  exceptions: Schema.Array(TraceEventException),
}).pipe(Type.Obj({ typename: 'dxos.org/type/TraceEvent', version: '0.1.0' }));

export type TraceEvent = Schema.Schema.Type<typeof TraceEvent>;

/**
 * InvocationTrace event format.
 * This is the combined format of InvocationTraceStartEvent and InvocationTraceEndEvents for UI consumption.
 */
export type InvocationSpan = {
  id: string;
  timestampMs: number;
  outcome: InvocationOutcome;
  input: object;
  durationMs: number;
  invocationTraceQueue: Ref.Ref<Queue>;
  invocationTarget: Ref.Ref<Type.Expando>;
  trigger?: Ref.Ref<FunctionTrigger>;
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
      log.warn('found end event without matching start', { invocationId });
      continue;
    }

    const isInProgress = end === undefined;

    result.push({
      id: invocationId,
      timestampMs: start.timestampMs,
      durationMs: isInProgress ? now - start.timestampMs : end!.timestampMs - start.timestampMs,
      outcome: end?.outcome ?? InvocationOutcome.PENDING,
      exception: end?.exception,
      input: start.input,
      invocationTraceQueue: start.invocationTraceQueue,
      invocationTarget: start.invocationTarget,
      trigger: start.trigger,
    });
  }

  return result;
};
