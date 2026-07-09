//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

//
// Shared JMAP core schemas (RFC 8620). These are capability-agnostic — they apply to mail, calendars,
// and contacts alike.
//

/** Session object returned from `https://${host}/.well-known/jmap` (RFC 8620 §2). */
export const Session = Schema.Struct({
  /** Endpoint for all subsequent API requests. */
  apiUrl: Schema.String,
  /**
   * URI Template (RFC 6570) for blob downloads, with `accountId`/`blobId`/`type`/`name` variables
   * (RFC 8620 §6.2). Optional here even though the spec requires it, so a fixture/mock session that
   * predates attachment support doesn't need updating; attachment fetching degrades gracefully when
   * absent (see `JmapMail.Target.downloadUrl`).
   */
  downloadUrl: Schema.optional(Schema.String),
  /** Authenticated username (used to seed the connection account when the form leaves it blank). */
  username: Schema.optional(Schema.String),
  /** Capability urn → primary account id (e.g. `urn:ietf:params:jmap:mail`). */
  primaryAccounts: Schema.Record({ key: Schema.String, value: Schema.String }),
  accounts: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  capabilities: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  state: Schema.optional(Schema.String),
});
export type Session = Schema.Schema.Type<typeof Session>;

/** A method-level error response: `["error", { type, description }, callId]` (RFC 8620 §3.6.1). */
export const MethodError = Schema.Struct({
  type: Schema.String,
  description: Schema.optional(Schema.NullOr(Schema.String)),
});
export type MethodError = Schema.Schema.Type<typeof MethodError>;

/** A single `[name, args, callId]` invocation result; `args` is decoded per-method by the caller. */
export const MethodResponse = Schema.Tuple(Schema.String, Schema.Unknown, Schema.String);
export type MethodResponse = Schema.Schema.Type<typeof MethodResponse>;

/** The top-level response envelope of a batched API request (RFC 8620 §3.3). */
export const Response = Schema.Struct({
  methodResponses: Schema.Array(MethodResponse),
  sessionState: Schema.optional(Schema.String),
});
export type Response = Schema.Schema.Type<typeof Response>;

//
// `Email/query` filter (RFC 8621 §4.4.1). Constructed client-side (never decoded), so these are plain
// types rather than Schemas. Shared here because future calendar/contacts filters share the same
// AND/OR/NOT operator structure (RFC 8620 §5.5).
//

/** A single filter condition; all present properties must match. */
export type FilterCondition = {
  readonly inMailbox?: string;
  readonly inMailboxOtherThan?: readonly string[];
  readonly before?: string;
  readonly after?: string;
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly hasKeyword?: string;
  readonly notKeyword?: string;
  readonly allInThreadHaveKeyword?: string;
  readonly someInThreadHaveKeyword?: string;
  readonly noneInThreadHaveKeyword?: string;
  readonly text?: string;
  readonly from?: string;
  readonly to?: string;
  readonly cc?: string;
  readonly bcc?: string;
  readonly subject?: string;
  readonly body?: string;
  readonly header?: readonly string[];
  readonly hasAttachment?: boolean;
};

/** Combines sub-filters (RFC 8620 §5.5). */
export type FilterOperator = {
  readonly operator: 'AND' | 'OR' | 'NOT';
  readonly conditions: readonly Filter[];
};

/** An `Email/query` filter: a single condition or an AND/OR/NOT combination. */
export type Filter = FilterCondition | FilterOperator;
