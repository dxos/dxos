//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';

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
export const write: <T>(eventType: EventType<T>, payload: NoInfer<T>) => Effect.Effect<void, never, TraceService> =
  Effect.serviceFunction(TraceService, (_) => _.write);

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
export interface Event extends Schema.Schema.Type<typeof Event> {}

/**
 * Checks if an event is of a given type.
 */
export const isOfType = <T, E extends Event>(eventType: EventType<T>, event: E): event is E & { data: T } => {
  return event.type === eventType.key;
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
   * ID of the conversation feed object if present.
   */
  conversationId: Schema.optional(Obj.ID),

  /**
   * ID of the trigger object if invocation resulted from a trigger.
   */
  triggerId: Schema.optional(Obj.ID),

  /**
   * ID of the tool call that created the current process.
   */
  toolCallId: Schema.optional(Schema.String),
});
export interface Meta extends Schema.Schema.Type<typeof Meta> {}

/**
 * Envelope for a set of events.
 */
export const MessageData = Schema.Struct({
  meta: Meta,

  isEphemeral: Schema.Boolean,
  events: Schema.Array(Event),
});
export interface MessageData extends Schema.Schema.Type<typeof MessageData> {}

export const Message = MessageData.pipe(
  Type.object({
    typename: 'org.dxos.type.traceMessage',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--note--regular',
    hue: 'rose',
  }),
);
export interface Message extends Schema.Schema.Type<typeof Message> {}

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
  if (sinks.length === 0) return noopSink;
  if (sinks.length === 1) return sinks[0]!;
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

export const testTraceService = (opts: { meta?: Meta } = {}): Layer.Layer<TraceService, never, TraceSink> =>
  Layer.effect(
    TraceService,
    Effect.gen(function* () {
      const sink = yield* TraceSink;
      return {
        write: (event, data) => {
          sink.write(
            Obj.make(Message, {
              meta: opts.meta ?? {},
              isEphemeral: event.isEphemeral,
              events: [{ type: event.key, timestamp: Date.now(), data }],
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
    /** Outcome of the operation. */
    outcome: Schema.Literal('success', 'failure'),
    /** Error message if the operation failed. */
    error: Schema.optional(Schema.String),
  }),
  isEphemeral: false,
});
