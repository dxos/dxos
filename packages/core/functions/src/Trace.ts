//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Annotation, Obj, Type } from '@dxos/echo';
import * as Layer from 'effect/Layer';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

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
export const isOfType = <T>(eventType: EventType<T>, event: Event): event is Event & { data: T } => {
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

export const layerNoop: Layer.Layer<TraceSink> = Layer.succeed(TraceSink, {
  write: () => {},
});

export const layerConsole: Layer.Layer<TraceSink> = Layer.succeed(TraceSink, {
  write: (message) => {
    console.log(message);
  },
});

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
