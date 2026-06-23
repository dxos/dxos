//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';

import * as Trigger from './Trigger';
import { log } from '@dxos/log';

/**
 * Writes ephemeral or persistent events to the trace.
 * Exposed to processes and operations to record events to the trace.
 */
export interface TraceWriter {
  write<T>(eventType: EventType<T>, payload: NoInfer<T>): void;
}

/**
 * Service that writes events to the trace.
 * Exposed to processes and operations to record events to the trace.
 */
export class TraceService extends Context.Tag('@dxos/functions/TraceService')<TraceService, TraceWriter>() {}

/**
 * Writes an event to the trace.
 */
export function write<T>(eventType: EventType<T>, payload: NoInfer<T>): Effect.Effect<void, never, TraceService> {
  return Effect.gen(function* () {
    log('trace write', { key: eventType.key, isEphemeral: eventType.isEphemeral });
    const writer = yield* TraceService;
    writer.write(eventType, payload);
  });
}

/**
 * Defines an event type for the trace.
 */
export interface EventType<T> {
  readonly key: string;
  readonly schema: Schema.Schema<T, any>;
  readonly isEphemeral: boolean;
}

export const EventType = <T>(
  key: string,
  opts: { schema: Schema.Schema<T, any>; isEphemeral: boolean },
): EventType<T> => {
  return {
    key,
    schema: opts.schema,
    isEphemeral: opts.isEphemeral,
  };
};

/**
 * Extracts the payload type from an event type.
 */
export type PayloadType<E extends EventType<any>> = E extends EventType<infer T> ? T : never;

export const Event = Schema.Struct({
  timestamp: Schema.Number,
  type: Schema.String,
  data: Schema.Unknown, // Type-specific payload;
});
export type Event = Schema.Schema.Type<typeof Event>;
/**
 * Checks if an event is of a given type.
 */
export const isOfType = <T, E extends Event>(eventType: EventType<T>, event: E): event is E & { data: T } => {
  return event.type === eventType.key;
};

/**
 * Extensible name informing which runtime executed the code that produced the event.
 */
export const RuntimeName = Schema.String.pipe(Schema.brand('@dxos/compute/Trace/RuntimeName'));
export type RuntimeName = Schema.Schema.Type<typeof RuntimeName>;

/**
 * Common runtime names.
 */
export const CommonRuntimeName = {
  /**
   * Web app / CLI / Desktop app / Mobile app.
   */
  local: RuntimeName.make('local'),
  edgeIntrinsic: RuntimeName.make('edge-intrinsic'),
  edgeWorkerLoader: RuntimeName.make('edge-worker-loader'),
  edgeWorkerForPlatforms: RuntimeName.make('edge-worker-for-platforms'),
};

/**
 * Metadata on the context of a trace message.
 */
// TODO(dmaretskyi): Expand on this: conversation id, tool call id, etc.
export const Meta = Schema.Struct({
  pid: Schema.optional(Schema.String), // NOTE: Not Process.ID to avoid circular dependency.
  parentPid: Schema.optional(Schema.String),
  processName: Schema.optional(Schema.String),

  /**
   * Space the message was produced in.
   * Stored as a string to avoid circular dependency on `@dxos/keys`.
   */
  space: Schema.optional(Schema.String),

  /**
   * Ref to the conversation feed object if present.
   */
  conversation: Ref.Ref(Obj.Unknown).pipe(Schema.optional),

  /**
   * Ref to the trigger object if invocation resulted from a trigger.
   */
  trigger: Ref.Ref(Trigger.Trigger).pipe(Schema.optional),

  /**
   * ID of the tool call that created the current process.
   */
  toolCallId: Schema.optional(Schema.String),

  /**
   * Extensible name informing which runtime executed the code that produced the event.
   */
  runtimeName: Schema.optional(RuntimeName),
});
export type Meta = Schema.Schema.Type<typeof Meta>;
/**
 * Checks if a runtime is an edge runtime.
 */
export const isEdgeRuntime = (name: RuntimeName): boolean =>
  name === CommonRuntimeName.edgeIntrinsic ||
  name === CommonRuntimeName.edgeWorkerLoader ||
  name === CommonRuntimeName.edgeWorkerForPlatforms;

/**
 * Envelope for a set of events.
 */
export const MessageData = Schema.Struct({
  meta: Meta,

  isEphemeral: Schema.Boolean,
  events: Schema.Array(Event),
});
export type MessageData = Schema.Schema.Type<typeof MessageData>;
export const Message = MessageData.pipe(
  Annotation.IconAnnotation.set({ icon: 'ph--note--regular', hue: 'rose' }),
  Annotation.HiddenAnnotation.set(true),
  Type.makeObject(DXN.make('org.dxos.type.traceMessage', '0.1.0')),
);
export type Message = Type.InstanceType<typeof Message>;
/**
 * Flattened representation of a signle event in a trace message.
 * Events are stored in batched messages for efficiency, but flat representation is more convenient for consumption.
 */
export interface FlatEvent extends Event {
  readonly meta: Meta;
  readonly isEphemeral: boolean;
}

/**
 * Flattens a trace message into a list of flat events.
 */
export const flatten = (message: Message): FlatEvent[] => {
  return message.events.map((event) => ({
    ...event,
    meta: message.meta,
    isEphemeral: message.isEphemeral,
  }));
};

/**
 * Sink for complete trace messages.
 */
export interface Sink {
  write(message: Message): void;
}

/**
 * Sink for complete trace messages.
 * The Process Manager forwards trace messages to it.
 */
// TODO(dmaretskyi): Consider moving sink to the Process Manager.
export class TraceSink extends Context.Tag('@dxos/functions/TraceSink')<TraceSink, Sink>() {}

export const noopWriter: TraceWriter = {
  write: () => {},
};

export const writerLayerNoop: Layer.Layer<TraceService> = Layer.succeed(TraceService, noopWriter);

export const noopSink: Sink = {
  write: () => {},
};

export const layerNoop: Layer.Layer<TraceSink> = Layer.succeed(TraceSink, noopSink);

export const layerConsole: Layer.Layer<TraceSink> = Layer.succeed(TraceSink, {
  write: (message) => {
    console.log(message);
  },
});

/**
 * Merge a set of sinks into a single sink.
 *
 * Each message is forwarded to every sink in order. Failures in one sink do not
 * prevent downstream sinks from receiving the message.
 */
export const mergeSinks = (sinks: readonly Sink[]): Sink => {
  if (sinks.length === 0) {
    return noopSink;
  }
  // Intentionally no singleton fast path: the guarded wrapper is the
  // contract of `mergeSinks`, so a throwing sink is always caught and
  // logged regardless of how many sinks were passed in.
  return {
    write: (message) => {
      for (const sink of sinks) {
        try {
          sink.write(message);
        } catch (err) {
          // Intentional: do not let one sink break the chain.
          // eslint-disable-next-line no-console
          console.error('[trace] sink.write threw', err);
        }
      }
    },
  };
};

/**
 * Builds a {@link TraceService} layer that wraps each `write` into a fresh {@link Message}
 * and forwards it to the provided {@link TraceSink}. Intended for tests and lightweight
 * fixtures.
 *
 * Options:
 *   - `meta`: stamped on every emitted message (defaults to `{}`).
 *   - `clock`: timestamp source (defaults to {@link Date.now}). Pass a monotonic counter
 *     in tests to make event ordering deterministic when many writes happen in the same
 *     millisecond.
 */
export const testTraceService = (
  opts: { meta?: Meta; clock?: () => number } = {},
): Layer.Layer<TraceService, never, TraceSink> =>
  Layer.effect(
    TraceService,
    Effect.gen(function* () {
      const sink = yield* TraceSink;
      const clock = opts.clock ?? Date.now;
      return {
        write: (event, data) => {
          sink.write(
            Obj.make(Message, {
              meta: opts.meta ?? {},
              isEphemeral: event.isEphemeral,
              events: [{ type: event.key, timestamp: clock(), data }],
            }),
          );
        },
      };
    }),
  );

//
// Operation Trace Events
//

/**
 * Outcome of an operation invocation.
 */
export type OperationOutcome = 'success' | 'failure';

/**
 * Operation invocation started.
 */
export const OperationStart = EventType('operation.start', {
  schema: Schema.Struct({
    /** Operation key. */
    key: Schema.String,
    /** Human-readable operation name. */
    name: Schema.optional(Schema.String),
    /** Phosphor icon identifier in `ph--<name>--<variant>` format. */
    icon: Schema.optional(Schema.String),
  }),
  isEphemeral: false,
});

/**
 * Operation invocation ended.
 */
export const OperationEnd = EventType('operation.end', {
  schema: Schema.Struct({
    /** Operation key. */
    key: Schema.String,
    /** Human-readable operation name. */
    name: Schema.optional(Schema.String),
    /** Phosphor icon identifier in `ph--<name>--<variant>` format. */
    icon: Schema.optional(Schema.String),
    /** Outcome of the operation. */
    outcome: Schema.Literal('success', 'failure'),
    /** Error message if the operation failed. */
    error: Schema.optional(Schema.String),
  }),
  isEphemeral: false,
});

/**
 * Operation input. Emitted as an ephemeral event alongside {@link OperationStart}
 * so subscribers (such as the undo/redo history tracker) can observe the raw
 * input payload without persisting it to long-lived sinks.
 */
export const OperationInput = EventType('operation.input', {
  schema: Schema.Struct({
    /** Operation key. */
    key: Schema.String,
    /** Human-readable operation name. */
    name: Schema.optional(Schema.String),
    /** Raw operation input. Shape determined by the operation definition. */
    input: Schema.Unknown,
  }),
  isEphemeral: true,
});

/**
 * Operation output. Emitted as an ephemeral event just before
 * {@link OperationEnd} for successful invocations so subscribers (such as the
 * undo/redo history tracker) can observe the raw output payload without
 * persisting it to long-lived sinks.
 */
export const OperationOutput = EventType('operation.output', {
  schema: Schema.Struct({
    /** Operation key. */
    key: Schema.String,
    /** Human-readable operation name. */
    name: Schema.optional(Schema.String),
    /** Raw operation output. Shape determined by the operation definition. */
    output: Schema.Unknown,
  }),
  isEphemeral: true,
});

/**
 * Human-readable status update emitted by an agent or operation.
 */
export const StatusUpdate = EventType('status.update', {
  schema: Schema.Struct({
    /** Human-readable status message. */
    message: Schema.String,
  }),
  isEphemeral: true,
});

/**
 * Emit the current human-readable execution status to the trace.
 */
export const emitStatus: (message: string) => Effect.Effect<void, never, TraceService> = (message) =>
  write(StatusUpdate, { message });
