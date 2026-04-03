//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';
import * as Process from './process/Process';
import { Annotation, Type } from '@dxos/echo';

/**
 * Writes ephemeral or persistent events to the trace.
 * Exposed to processes and operations to record events to the trace.
 */
export interface TraceWriter {
  write<T>(eventType: EventType<T>, payload: T): void;
}

/**
 * Service that writes events to the trace.
 * Exposed to processes and operations to record events to the trace.
 */
export class TraceService extends Context.Tag('@dxos/functions/TraceService')<TraceService, TraceWriter>() {}

/**
 * Defines an event type for the trace.
 */
export interface EventType<T> {
  readonly key: string;
  readonly schema: Schema.Schema<T>;
  readonly isEphemeral: boolean;
}

export const EventType = <T>(key: string, opts: { schema: Schema.Schema<T>; isEphemeral: boolean }): EventType<T> => {
  return {
    key,
    schema: opts.schema,
    isEphemeral: opts.isEphemeral,
  };
};

export const Event = Schema.Struct({
  timestamp: Schema.Number,
  type: Schema.String,
  data: Schema.Unknown, // Type-specific payload;
});
export interface Event extends Schema.Schema.Type<typeof Event> {}

/**
 * Envelope for a set of events.
 */
export const MessageData = Schema.Struct({
  // TODO(dmaretskyi): Expand on this: conversation id, etc..
  pid: Process.ID,
  parentPid: Schema.optional(Process.ID),

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
export class TraceSink extends Context.Tag('@dxos/functions/TraceSink')<TraceSink, Sink>() {}
