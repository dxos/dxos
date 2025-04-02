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
  outcome: InvocationOutcome;
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
  const startEvents = new Map<ObjectId, InvocationTraceStartEvent>();
  const result: InvocationSpan[] = [];
  for (const item of items) {
    if (item.type === InvocationTraceEventType.START) {
      startEvents.set(item.invocationId, item);
    } else if (item.type === InvocationTraceEventType.END) {
      const matchingStart = startEvents.get(item.invocationId);
      if (!matchingStart) {
        log.warn('end event without matching start', { item });
        continue;
      }
      result.push({
        id: item.invocationId,
        durationMs: item.timestampMs - matchingStart.timestampMs,
        timestampMs: item.timestampMs,
        outcome: item.outcome,
        exception: item.exception,
        trigger: matchingStart.trigger,
        input: matchingStart.input,
        invocationTraceQueue: matchingStart.invocationTraceQueue,
        invocationTarget: matchingStart.invocationTarget,
      });
    } else {
      // TODO: remove, the deprecated InvocationTrace format is no longer produced by functions backend
      result.push(item as InvocationSpan);
    }
  }
  return result;
};
