//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Body of `POST /inbox/:recipientDid`.
 * The sender is taken from the verified presentation, never from the body.
 */
export const InboxSendRequestSchema = Schema.Struct({
  /** Opaque to EDGE: base64 of a binary-encoded signed `dxos.halo.credentials.Credential`. */
  payload: Schema.String,
});
export type InboxSendRequest = Schema.Schema.Type<typeof InboxSendRequestSchema>;

export const InboxSendResponseSchema = Schema.Struct({
  id: Schema.String,
});
export type InboxSendResponse = Schema.Schema.Type<typeof InboxSendResponseSchema>;

/**
 * A pending notice as EDGE stores and returns it.
 */
export const InboxNoticeSchema = Schema.Struct({
  /** Assigned by EDGE; the handle passed to `POST /inbox/ack`. */
  id: Schema.String,
  /** Identity DID of the authenticated sender. */
  senderDid: Schema.String,
  /** Epoch milliseconds. */
  sentAt: Schema.Number,
  /** Epoch milliseconds. */
  expiresAt: Schema.Number,
  payload: Schema.String,
});
export type InboxNotice = Schema.Schema.Type<typeof InboxNoticeSchema>;

/**
 * Response of `GET /inbox`: the caller's own pending notices.
 */
export const InboxListResponseSchema = Schema.Struct({
  notices: Schema.Array(InboxNoticeSchema),
});
export type InboxListResponse = Schema.Schema.Type<typeof InboxListResponseSchema>;

/**
 * Body of `POST /inbox/ack`: removes the notices for every device of the caller's identity.
 */
export const InboxAckRequestSchema = Schema.Struct({
  ids: Schema.Array(Schema.String),
});
export type InboxAckRequest = Schema.Schema.Type<typeof InboxAckRequestSchema>;
