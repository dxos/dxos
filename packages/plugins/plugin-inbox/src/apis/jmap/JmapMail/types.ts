//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

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

/** A body part reference (the `partId` keys into `Email.bodyValues`; `blobId` fetches raw bytes). */
export const EmailBodyPart = Schema.Struct({
  partId: Schema.optional(Schema.NullOr(Schema.String)),
  blobId: Schema.optional(Schema.NullOr(Schema.String)),
  size: Schema.optional(Schema.Number),
  type: Schema.optional(Schema.String),
  charset: Schema.optional(Schema.NullOr(Schema.String)),
  /** Attachment filename, present on parts listed in `Email.attachments`. */
  name: Schema.optional(Schema.NullOr(Schema.String)),
  /** MIME `Content-Disposition` (`attachment` or `inline`), present on parts listed in `Email.attachments`. */
  disposition: Schema.optional(Schema.NullOr(Schema.String)),
  /** The part's `Content-ID` header (RFC 8621 §4.1.4), if any — matches a `cid:` reference in an HTML body. */
  cid: Schema.optional(Schema.NullOr(Schema.String)),
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
  /** Non-body parts (RFC 8621 §4.1.4) — the attachments proper, distinct from `textBody`/`htmlBody`. */
  attachments: Schema.optional(Schema.Array(EmailBodyPart)),
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
// Method-result schemas.
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

/** `Email/changes` delta since an opaque `sinceState` token (RFC 8621 §4.3 / RFC 8620 §5.2). */
export const EmailChangesResult = Schema.Struct({
  accountId: Schema.optional(Schema.String),
  oldState: Schema.String,
  newState: Schema.String,
  hasMoreChanges: Schema.Boolean,
  created: Schema.Array(Schema.String),
  updated: Schema.Array(Schema.String),
  destroyed: Schema.Array(Schema.String),
});
export type EmailChangesResult = Schema.Schema.Type<typeof EmailChangesResult>;

export const IdentityGetResult = Schema.Struct({
  accountId: Schema.optional(Schema.String),
  state: Schema.optional(Schema.String),
  list: Schema.Array(Identity),
  notFound: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
});
export type IdentityGetResult = Schema.Schema.Type<typeof IdentityGetResult>;

export const EmailSetResult = Schema.Struct({
  accountId: Schema.optional(Schema.String),
  oldState: Schema.optional(Schema.NullOr(Schema.String)),
  newState: Schema.optional(Schema.String),
  created: Schema.optional(
    Schema.NullOr(
      Schema.Record({
        key: Schema.String,
        value: Schema.Struct({
          id: Schema.String,
          blobId: Schema.optional(Schema.String),
          threadId: Schema.optional(Schema.String),
          size: Schema.optional(Schema.Number),
        }),
      }),
    ),
  ),
  updated: Schema.optional(Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Unknown }))),
  destroyed: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  notCreated: Schema.optional(
    Schema.NullOr(
      Schema.Record({
        key: Schema.String,
        value: Schema.Struct({ type: Schema.String, description: Schema.optional(Schema.NullOr(Schema.String)) }),
      }),
    ),
  ),
  notUpdated: Schema.optional(
    Schema.NullOr(
      Schema.Record({
        key: Schema.String,
        value: Schema.Struct({ type: Schema.String, description: Schema.optional(Schema.NullOr(Schema.String)) }),
      }),
    ),
  ),
  notDestroyed: Schema.optional(
    Schema.NullOr(
      Schema.Record({
        key: Schema.String,
        value: Schema.Struct({ type: Schema.String, description: Schema.optional(Schema.NullOr(Schema.String)) }),
      }),
    ),
  ),
});
export type EmailSetResult = Schema.Schema.Type<typeof EmailSetResult>;

export const EmailSubmissionSetResult = Schema.Struct({
  accountId: Schema.optional(Schema.String),
  newState: Schema.optional(Schema.String),
  created: Schema.optional(
    Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Struct({ id: Schema.String }) })),
  ),
  notCreated: Schema.optional(
    Schema.NullOr(
      Schema.Record({
        key: Schema.String,
        value: Schema.Struct({ type: Schema.String, description: Schema.optional(Schema.NullOr(Schema.String)) }),
      }),
    ),
  ),
});
export type EmailSubmissionSetResult = Schema.Schema.Type<typeof EmailSubmissionSetResult>;
