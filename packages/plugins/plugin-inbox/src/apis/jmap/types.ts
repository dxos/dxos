//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

//
// JMAP (RFC 8620 core / RFC 8621 mail) wire schemas. Response bodies are decoded against these so
// method-response narrowing is typed (no `as` casts). Optional fields use `NullOr` where the server
// may send an explicit `null` (e.g. absent address lists, empty subject).
//

/** Session object returned from `https://${host}/.well-known/jmap` (RFC 8620 §2). */
export const Session = Schema.Struct({
  /** Endpoint for all subsequent API requests. */
  apiUrl: Schema.String,
  /** Authenticated username (used to seed the connection account when the form leaves it blank). */
  username: Schema.optional(Schema.String),
  /** Capability urn → primary account id (e.g. `urn:ietf:params:jmap:mail`). */
  primaryAccounts: Schema.Record({ key: Schema.String, value: Schema.String }),
  accounts: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  capabilities: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  state: Schema.optional(Schema.String),
});
export type Session = Schema.Schema.Type<typeof Session>;

/** Structured email address — JMAP gives `{ name, email }` directly (no header parsing). */
export const EmailAddress = Schema.Struct({
  name: Schema.optional(Schema.NullOr(Schema.String)),
  email: Schema.String,
});
export type EmailAddress = Schema.Schema.Type<typeof EmailAddress>;

/** A folder. `role` is a well-known role (`inbox`, `drafts`, `sent`, `trash`, …) or null for custom folders. */
export const Mailbox = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  role: Schema.optional(Schema.NullOr(Schema.String)),
  parentId: Schema.optional(Schema.NullOr(Schema.String)),
  sortOrder: Schema.optional(Schema.Number),
  totalEmails: Schema.optional(Schema.Number),
  unreadEmails: Schema.optional(Schema.Number),
});
export type Mailbox = Schema.Schema.Type<typeof Mailbox>;

/** A decoded body part value (when fetched with `fetchTextBodyValues`). */
export const BodyValue = Schema.Struct({
  value: Schema.String,
  isEncodingProblem: Schema.optional(Schema.Boolean),
  isTruncated: Schema.optional(Schema.Boolean),
});
export type BodyValue = Schema.Schema.Type<typeof BodyValue>;

/** A body part reference (the `partId` keys into `Email.bodyValues`). */
export const EmailBodyPart = Schema.Struct({
  partId: Schema.optional(Schema.NullOr(Schema.String)),
  blobId: Schema.optional(Schema.NullOr(Schema.String)),
  size: Schema.optional(Schema.Number),
  type: Schema.optional(Schema.String),
  charset: Schema.optional(Schema.NullOr(Schema.String)),
});
export type EmailBodyPart = Schema.Schema.Type<typeof EmailBodyPart>;

/** An email (RFC 8621 §4). Only the properties requested in `Email/get` are present. */
export const Email = Schema.Struct({
  id: Schema.String,
  blobId: Schema.optional(Schema.String),
  threadId: Schema.optional(Schema.String),
  mailboxIds: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Boolean })),
  keywords: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Boolean })),
  from: Schema.optional(Schema.NullOr(Schema.Array(EmailAddress))),
  to: Schema.optional(Schema.NullOr(Schema.Array(EmailAddress))),
  cc: Schema.optional(Schema.NullOr(Schema.Array(EmailAddress))),
  bcc: Schema.optional(Schema.NullOr(Schema.Array(EmailAddress))),
  subject: Schema.optional(Schema.NullOr(Schema.String)),
  receivedAt: Schema.String,
  sentAt: Schema.optional(Schema.NullOr(Schema.String)),
  preview: Schema.optional(Schema.NullOr(Schema.String)),
  messageId: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  inReplyTo: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  references: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  bodyValues: Schema.optional(Schema.Record({ key: Schema.String, value: BodyValue })),
  textBody: Schema.optional(Schema.Array(EmailBodyPart)),
  htmlBody: Schema.optional(Schema.Array(EmailBodyPart)),
});
export type Email = Schema.Schema.Type<typeof Email>;

/** A sending identity (RFC 8621 §6); `email` is an address the server permits as `from`. */
export const Identity = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.NullOr(Schema.String)),
  email: Schema.String,
});
export type Identity = Schema.Schema.Type<typeof Identity>;

//
// Method-result schemas (the second element of a `methodResponses` tuple).
//

export const MailboxGetResult = Schema.Struct({
  accountId: Schema.optional(Schema.String),
  state: Schema.optional(Schema.String),
  list: Schema.Array(Mailbox),
  notFound: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
});
export type MailboxGetResult = Schema.Schema.Type<typeof MailboxGetResult>;

export const EmailQueryResult = Schema.Struct({
  accountId: Schema.optional(Schema.String),
  queryState: Schema.optional(Schema.String),
  position: Schema.optional(Schema.Number),
  total: Schema.optional(Schema.Number),
  limit: Schema.optional(Schema.Number),
  ids: Schema.Array(Schema.String),
});
export type EmailQueryResult = Schema.Schema.Type<typeof EmailQueryResult>;

export const EmailGetResult = Schema.Struct({
  accountId: Schema.optional(Schema.String),
  state: Schema.optional(Schema.String),
  list: Schema.Array(Email),
  notFound: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
});
export type EmailGetResult = Schema.Schema.Type<typeof EmailGetResult>;

export const IdentityGetResult = Schema.Struct({
  accountId: Schema.optional(Schema.String),
  state: Schema.optional(Schema.String),
  list: Schema.Array(Identity),
  notFound: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
});
export type IdentityGetResult = Schema.Schema.Type<typeof IdentityGetResult>;

/** A per-record failure in a `/set` call (RFC 8620 §5.3). */
export const SetError = Schema.Struct({
  type: Schema.String,
  description: Schema.optional(Schema.NullOr(Schema.String)),
});
export type SetError = Schema.Schema.Type<typeof SetError>;

/** Server-set properties echoed back for a created record. */
export const CreatedEntity = Schema.Struct({
  id: Schema.String,
  blobId: Schema.optional(Schema.String),
  threadId: Schema.optional(Schema.String),
  size: Schema.optional(Schema.Number),
});
export type CreatedEntity = Schema.Schema.Type<typeof CreatedEntity>;

export const EmailSetResult = Schema.Struct({
  accountId: Schema.optional(Schema.String),
  oldState: Schema.optional(Schema.NullOr(Schema.String)),
  newState: Schema.optional(Schema.String),
  created: Schema.optional(Schema.NullOr(Schema.Record({ key: Schema.String, value: CreatedEntity }))),
  updated: Schema.optional(Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Unknown }))),
  destroyed: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  notCreated: Schema.optional(Schema.NullOr(Schema.Record({ key: Schema.String, value: SetError }))),
  notUpdated: Schema.optional(Schema.NullOr(Schema.Record({ key: Schema.String, value: SetError }))),
  notDestroyed: Schema.optional(Schema.NullOr(Schema.Record({ key: Schema.String, value: SetError }))),
});
export type EmailSetResult = Schema.Schema.Type<typeof EmailSetResult>;

export const EmailSubmissionSetResult = Schema.Struct({
  accountId: Schema.optional(Schema.String),
  newState: Schema.optional(Schema.String),
  created: Schema.optional(
    Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Struct({ id: Schema.String }) })),
  ),
  notCreated: Schema.optional(Schema.NullOr(Schema.Record({ key: Schema.String, value: SetError }))),
});
export type EmailSubmissionSetResult = Schema.Schema.Type<typeof EmailSubmissionSetResult>;

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
// `Email/query` filter (RFC 8621 §4.4.1). Constructed client-side (never decoded), so these are
// plain types rather than Schemas.
//

/** A single filter condition; an email matches when all present properties match. */
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
