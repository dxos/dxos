//
// Copyright 2025 DXOS.org
//

import { EchoObject, Expando, ObjectId, Ref, S } from '@dxos/echo-schema';

import { FunctionTrigger } from './types';

const InvocationTrace = S.Struct({
  id: ObjectId,
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
}).pipe(EchoObject('dxos.org/type/InvocationTrace', '0.1.0'));

export type InvocationTraceEvent = S.Schema.Type<typeof InvocationTrace>;

const TraceEventLog = S.Struct({
  timestampMs: S.Number,
  level: S.String,
  message: S.String,
  context: S.optional(S.Object),
});

const TraceEventException = S.Struct({
  timestampMs: S.Number,
  message: S.String,
  name: S.String,
  stack: S.optional(S.String),
});

const TraceEvent = S.Struct({
  id: ObjectId,
  outcome: S.String,
  truncated: S.Boolean,
  logs: S.Array(TraceEventLog),
  exceptions: S.Array(TraceEventException),
}).pipe(EchoObject('dxos.org/type/TraceEvent', '0.1.0'));

export type TraceEvent = S.Schema.Type<typeof TraceEvent>;
