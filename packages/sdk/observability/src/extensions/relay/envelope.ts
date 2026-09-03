//
// Copyright 2026 DXOS.org
//

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

const KINDS: ReadonlySet<string> = new Set<Kind>([
  'identify',
  'alias',
  'event',
  'exception',
  'ai.inference',
  'ai.turn',
  'ai.toolCall',
  'mcp.initialize',
  'mcp.toolCall',
]);

/** Structural check for a decoded channel message; the payload fields are trusted by kind. */
export const isEnvelope = (value: unknown): value is Envelope => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate.v === VERSION &&
    typeof candidate.timestamp === 'number' &&
    typeof candidate.tags === 'object' &&
    candidate.tags !== null &&
    typeof candidate.kind === 'string' &&
    KINDS.has(candidate.kind)
  );
};

export const serializeError = (error: Error): SerializedError => ({
  name: error.name,
  message: error.message,
  ...(error.stack ? { stack: error.stack } : {}),
});
