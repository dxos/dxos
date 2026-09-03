//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type * as ObservabilityExtension from '../../ObservabilityExtension';

/** Bumped when a payload changes shape, so a relay built against an older worker can refuse it. */
export const VERSION = 1;

/** Structured-clone safe stand-in for an `Error`; the class itself does not cross a channel. */
export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
};

export type McpToolCall = ObservabilityExtension.McpSession & {
  toolName: string;
  parameters?: unknown;
  durationMs: number;
  isError: boolean;
};

/** One captured record, discriminated by the extension kind and method that produced it. */
export type Payload =
  | { kind: 'identify'; properties?: ObservabilityExtension.Attributes; setOnce?: ObservabilityExtension.Attributes }
  | { kind: 'alias'; previousId: string }
  | { kind: 'event'; event: string; properties?: ObservabilityExtension.EventAttributes }
  | { kind: 'exception'; error: SerializedError; properties?: ObservabilityExtension.Attributes }
  | { kind: 'ai.inference'; inference: ObservabilityExtension.Inference }
  | { kind: 'ai.turn'; turn: ObservabilityExtension.Turn }
  | { kind: 'ai.toolCall'; toolCall: ObservabilityExtension.ToolCall }
  | { kind: 'mcp.initialize'; session: ObservabilityExtension.McpSession }
  | { kind: 'mcp.toolCall'; call: McpToolCall };

export type Kind = Payload['kind'];

/**
 * What the relay extension hands to its host, and what the relay on the other side decodes. The
 * envelope carries everything a backend needs to attribute the record, so the relay stays a
 * transport with no state of its own.
 */
export type Envelope = {
  v: typeof VERSION;
  /** Unix milliseconds at capture, since the relay forwards later than the record happened. */
  timestamp: number;
  /** Person the record belongs to; absent until `identify` ran, in which case a relay may drop it. */
  distinctId?: string;
  /** Release, environment and whatever `setTags` added: super properties for every record. */
  tags: Record<string, string>;
} & Payload;

//
// Wire schema. Mirrors the extension types field for field where a relay reads the value, and
// stays open (`Unknown`) for the content blobs it only forwards. The TS types above remain the
// contract; the schema is what a decoded channel message is checked against.
//

const Attributes = Schema.Record(
  Schema.String,
  Schema.Union([Schema.String, Schema.Number, Schema.Boolean, Schema.Undefined]),
);
const EventAttributes = Schema.Record(Schema.String, Schema.Unknown);

const AiSpanBaseFields = {
  traceId: Schema.String,
  spanId: Schema.String,
  parentSpanId: Schema.optional(Schema.String),
  spanName: Schema.String,
  sessionId: Schema.optional(Schema.String),
  latency: Schema.Number,
  errorClass: Schema.optional(Schema.String),
};

const AiSpanContent = Schema.Struct({
  input: Schema.optional(Schema.Unknown),
  output: Schema.optional(Schema.Unknown),
  truncated: Schema.optional(Schema.Boolean),
});

const AiSpan = Schema.Struct({ ...AiSpanBaseFields, content: Schema.optional(AiSpanContent) });

const Inference = Schema.Struct({
  ...AiSpanBaseFields,
  provider: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
  parameters: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  inputTokens: Schema.optional(Schema.Number),
  outputTokens: Schema.optional(Schema.Number),
  cacheReadTokens: Schema.optional(Schema.Number),
  cacheWriteTokens: Schema.optional(Schema.Number),
  streaming: Schema.Boolean,
  content: Schema.optional(
    Schema.Struct({
      input: Schema.optional(Schema.Unknown),
      output: Schema.optional(Schema.Unknown),
      tools: Schema.optional(Schema.Unknown),
      truncated: Schema.optional(Schema.Boolean),
    }),
  ),
});

const McpSessionFields = {
  sessionId: Schema.String,
  clientName: Schema.optional(Schema.String),
  clientVersion: Schema.optional(Schema.String),
  protocolVersion: Schema.optional(Schema.String),
};

const EnvelopeFields = {
  v: Schema.Literal(VERSION),
  timestamp: Schema.Number,
  distinctId: Schema.optional(Schema.String),
  tags: Schema.Record(Schema.String, Schema.String),
};

const variant = <K extends Kind, F extends Schema.Struct.Fields>(kind: K, fields: F) =>
  Schema.Struct({ ...EnvelopeFields, kind: Schema.Literal(kind), ...fields });

export const EnvelopeSchema = Schema.Union([
  variant('identify', { properties: Schema.optional(Attributes), setOnce: Schema.optional(Attributes) }),
  variant('alias', { previousId: Schema.String }),
  variant('event', { event: Schema.String, properties: Schema.optional(EventAttributes) }),
  variant('exception', {
    error: Schema.Struct({ name: Schema.String, message: Schema.String, stack: Schema.optional(Schema.String) }),
    properties: Schema.optional(Attributes),
  }),
  variant('ai.inference', { inference: Inference }),
  variant('ai.turn', { turn: AiSpan }),
  variant('ai.toolCall', { toolCall: AiSpan }),
  variant('mcp.initialize', { session: Schema.Struct(McpSessionFields) }),
  variant('mcp.toolCall', {
    call: Schema.Struct({
      ...McpSessionFields,
      toolName: Schema.String,
      parameters: Schema.optional(Schema.Unknown),
      durationMs: Schema.Number,
      isError: Schema.Boolean,
    }),
  }),
]);

const decodeEnvelope = Schema.decodeUnknownOption(EnvelopeSchema);

/** Whether a decoded channel message is an envelope this relay version understands. */
export const isEnvelope = (value: unknown): value is Envelope => Option.isSome(decodeEnvelope(value));

export const serializeError = (error: Error): SerializedError => ({
  name: error.name,
  message: error.message,
  ...(error.stack ? { stack: error.stack } : {}),
});
