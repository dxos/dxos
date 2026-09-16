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

/** Response schemas: the identifiers below are persisted, so they are validated before use. */

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

/** Which end of a session's event stream to read: the opening events, or the most recent ones. */
export const EventOrder = Schema.Literals(['first', 'last']);
export type EventOrder = Schema.Schema.Type<typeof EventOrder>;

export const EventPage = Schema.Struct({
  data: Schema.optional(Schema.Array(SessionEvent)),
  next_page: Schema.optional(Schema.NullOr(Schema.String)),
});
export interface EventPage extends Schema.Schema.Type<typeof EventPage> {}

/** The secret is substituted at egress, so it never reaches the container. */
export type EnvironmentVariableCredential = {
  display_name: string;
  auth: {
    type: 'environment_variable';
    secret_name: string;
    secret_value: string;
    networking: { type: 'limited'; allowed_hosts: string[] } | { type: 'unrestricted' };
  };
};

export const VaultResponse = Schema.Struct({
  id: Schema.String,
  display_name: Schema.optional(Schema.String),
});
export interface VaultResponse extends Schema.Schema.Type<typeof VaultResponse> {}

/** Secret values are write-only, so an upsert matches on `auth.secret_name`. */
export const CredentialResponse = Schema.Struct({
  id: Schema.String,
  auth: Schema.optional(Schema.Struct({ secret_name: Schema.optional(Schema.String) })),
});
export interface CredentialResponse extends Schema.Schema.Type<typeof CredentialResponse> {}

export const CredentialPage = Schema.Struct({
  data: Schema.optional(Schema.Array(CredentialResponse)),
  next_page: Schema.optional(Schema.NullOr(Schema.String)),
});
export interface CredentialPage extends Schema.Schema.Type<typeof CredentialPage> {}

/** Accepted where the response body carries nothing the caller reads. */
export const Ignored = Schema.Unknown;

/**
 * One turn of a session transcript, flattened for the assistant. Aliased from the operation schema
 * so the wire shape and the schema `GetTranscript.output` validates against cannot drift apart.
 */
export type TranscriptMessage = ClaudeAgentOperation.TranscriptMessage;
