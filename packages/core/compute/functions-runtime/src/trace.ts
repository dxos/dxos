//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Trigger } from '@dxos/compute';
import { Process } from '@dxos/compute';
// QueryAST is referenced indirectly through `Type.InstanceType<typeof ...EventSchema>`
// in the emitted .d.ts; the namespace import keeps the inferred types portable.
// eslint-disable-next-line unused-imports/no-unused-imports
import { DXN, Feed, Obj, QueryAST, Ref, Type } from '@dxos/echo';
import { EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { FunctionRuntimeKind, SerializedError } from '@dxos/protocols';

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

/**
 * @deprecated Relace with EncodedError.
 */
export const TraceEventException = Schema.Struct({
  timestamp: Schema.Number,
  message: Schema.String,
  name: Schema.String,
  stack: Schema.optional(Schema.String),
});

export type TraceEventException = Schema.Schema.Type<typeof TraceEventException>;

export const InvocationTraceStartEvent = Schema.Struct({
  /**
   * Queue message id.
   */
  id: EntityId,
  type: Schema.Literal(InvocationTraceEventType.START),
  /**
   * Invocation id, the same for invocation start and end events.
   */
  invocationId: EntityId,

  /**
   * Id of the parent invocation.
   */
  parentInvocationId: Schema.optional(EntityId),

  /**
   * Event generation time.
   */
  timestamp: Schema.Number,
  /**
   * Data passed to function / workflow as an argument.
   */
  input: Schema.Unknown,
  /**
   * Feed for function/workflow invocation events.
   * If missing, events are assumed to be in the same Feed.
   */
  invocationTraceFeed: Schema.optional(Ref.Ref(Feed.Feed)),
  /**
   * DXN of the invoked function/workflow.
   */
  invocationTarget: Schema.optional(Ref.Ref(Obj.Unknown)),
  /**
   * Present for automatic invocations.
   */
  trigger: Schema.optional(Ref.Ref(Trigger.Trigger)),
  /**
   * Chat that the invocation is run in.
   * For invocations resulting from submitting a prompt in a chat thread.
   */
  chat: Schema.optional(Ref.Ref(Obj.Unknown)),
  /**
   * Process-specific metadata.
   */
  process: Schema.optional(
    Schema.Struct({
      pid: Process.ID,
      parentPid: Schema.optional(Process.ID),
      /**
       * Key of the executable.
       */
      key: Schema.String,

      /**
       * Process name.
       */
      name: Schema.optional(Schema.String),

      /**
       * Target object that the process is assigned to.
       */
      target: Schema.optional(Schema.String),
    }),
  ),
  /**
   * Runtime executing the function.
   */
  runtime: Schema.optional(FunctionRuntimeKind),
}).pipe(Type.makeObject(DXN.make('org.dxos.type.invocationTraceStart', '0.1.0')));

export interface InvocationTraceStartEvent extends Type.InstanceType<typeof InvocationTraceStartEvent> {}

export const InvocationTraceEndEvent = Schema.Struct({
  /**
   * Trace event id.
   */
  id: EntityId,
  type: Schema.Literal(InvocationTraceEventType.END),
  /**
   * Invocation id, will be the same for invocation start and end.
   */
  invocationId: EntityId,
  /**
   * Event generation time.
   */
  // TODO(burdon): Remove ms suffix.
  timestamp: Schema.Number,

  outcome: Schema.Enums(InvocationOutcome),

  error: Schema.optional(SerializedError),
}).pipe(Type.makeObject(DXN.make('org.dxos.type.invocationTraceEnd', '0.1.0')));

export interface InvocationTraceEndEvent extends Type.InstanceType<typeof InvocationTraceEndEvent> {}

export type InvocationTraceEvent = InvocationTraceStartEvent | InvocationTraceEndEvent;

export const TraceEventLog = Schema.Struct({
  timestamp: Schema.Number,
  level: Schema.String,
  message: Schema.String,
  context: Schema.optional(Schema.Object),
});

export const TraceEvent = Schema.Struct({
  id: EntityId,
  // TODO(burdon): Need enum/numeric result (not string).
  outcome: Schema.String,
  truncated: Schema.Boolean,
  /** Time when the event was persisted. */
  ingestionTimestamp: Schema.Number,
  logs: Schema.Array(TraceEventLog),
  exceptions: Schema.Array(TraceEventException),
}).pipe(Type.makeObject(DXN.make('org.dxos.type.traceEvent', '0.1.0')));

export type TraceEvent = Type.InstanceType<typeof TraceEvent>;

/**
 * InvocationTrace event format.
 * This is the combined format of InvocationTraceStartEvent and InvocationTraceEndEvents for UI consumption.
 */
export type InvocationSpan = {
  id: string;
  /** Human-readable name (e.g. operation name); preferred over the resolved target when present. */
  name?: string;
  timestamp: number;
  duration: number;
  outcome: InvocationOutcome;
  input: unknown;
  invocationTraceFeed?: Ref.Ref<Feed.Feed>;
  invocationTarget?: Ref.Ref<Obj.Unknown>;
  trigger?: Ref.Ref<Trigger.Trigger>;
  error?: SerializedError;
  runtime?: FunctionRuntimeKind;
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
      timestamp: start.timestamp,
      duration: isInProgress ? now - start.timestamp : end!.timestamp - start.timestamp,
      outcome: end?.outcome ?? InvocationOutcome.PENDING,
      error: end?.error,
      input: start.input,
      invocationTraceFeed: start.invocationTraceFeed,
      invocationTarget: start.invocationTarget,
      trigger: start.trigger,
      runtime: start.runtime,
    });
  }

  return result;
};
