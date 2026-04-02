//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';
import * as Process from './process/Process';

/**
 * Writes ephemeral or persistent events to the trace.
 */
export interface TraceWriter {
  write<T>(eventType: EventType<T>, payload: T): void;
}

/**
 * Service that writes events to the trace.
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

interface Event {
  readonly timestamp: number;
  readonly type: string;
  readonly data: unknown; // Type-specific payload;
}

/**
 * Envelope for a set of events.
 */
export interface Message {
  // TODO(dmaretskyi): Expand on this: conversation id, etc..
  readonly pid: Process.ID;
  readonly parentPid?: Process.ID;

  readonly isEphemeral: boolean;
  readonly events: Event[];
}
