//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type ClaudeAgentOperation } from '#types';

/** The `CreateAgent` / `UpdateAgent` request body. Snake-cased to match the wire format. */
export type AgentConfig = {
  name: string;
  model: string | { id: string; effort?: string };
  description?: string;
  system?: string;
  tools?: { type: string }[];
  skills?: { type: 'anthropic'; skill_id: string }[];
  mcp_servers?: { type: 'url'; name: string; url: string }[];
};

/**
 * Response schemas, decoded before use. Every identifier below is persisted on an object that later
 * requests are addressed by, so a response missing one has to fail the operation rather than store
 * `undefined` and leave a record pointing at nothing.
 */

export const AgentResponse = Schema.Struct({
  id: Schema.String,
  version: Schema.optional(Schema.Number),
});
export interface AgentResponse extends Schema.Schema.Type<typeof AgentResponse> {}

export const EnvironmentResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
});
export interface EnvironmentResponse extends Schema.Schema.Type<typeof EnvironmentResponse> {}

export const SessionResponse = Schema.Struct({
  id: Schema.String,
  status: Schema.optional(Schema.String),
  stop_reason: Schema.optional(Schema.NullOr(Schema.Struct({ type: Schema.String }))),
  title: Schema.optional(Schema.String),
});
export interface SessionResponse extends Schema.Schema.Type<typeof SessionResponse> {}

/** A content block on a message event; only text blocks carry readable content. */
export const ContentBlock = Schema.Struct({
  type: Schema.String,
  text: Schema.optional(Schema.String),
});
export interface ContentBlock extends Schema.Schema.Type<typeof ContentBlock> {}

export const SessionEvent = Schema.Struct({
  id: Schema.optional(Schema.String),
  type: Schema.String,
  content: Schema.optional(Schema.Array(ContentBlock)),
  processed_at: Schema.optional(Schema.NullOr(Schema.String)),
});
export interface SessionEvent extends Schema.Schema.Type<typeof SessionEvent> {}

export const EventPage = Schema.Struct({
  data: Schema.optional(Schema.Array(SessionEvent)),
  next_page: Schema.optional(Schema.NullOr(Schema.String)),
});
export interface EventPage extends Schema.Schema.Type<typeof EventPage> {}

/** Accepted where the response body carries nothing the caller reads. */
export const Ignored = Schema.Unknown;

/**
 * One turn of a session transcript, flattened for the assistant. Aliased from the operation schema
 * so the wire shape and the schema `GetTranscript.output` validates against cannot drift apart.
 */
export type TranscriptMessage = ClaudeAgentOperation.TranscriptMessage;
