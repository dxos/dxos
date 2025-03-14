//
// Copyright 2025 DXOS.org
//

import { EchoObject, Expando, ObjectId, Ref, S } from '@dxos/echo-schema';

import { FunctionTrigger } from './types';

export enum InvocationOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export const TraceEventException = S.Struct({
  timestampMs: S.Number,
  message: S.String,
  name: S.String,
  stack: S.optional(S.String),
});

export const InvocationTraceEvent = S.Struct({
  id: ObjectId,
  timestampMs: S.Number,
  outcome: S.Enums(InvocationOutcome),
  input: S.Object,
  durationMs: S.Number,
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
  /**
   * Present for outcome FAILURE.
   */
  exception: S.optional(TraceEventException),
}).pipe(EchoObject('dxos.org/type/InvocationTrace', '0.1.0'));

export type InvocationTraceEvent = S.Schema.Type<typeof InvocationTraceEvent>;

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
