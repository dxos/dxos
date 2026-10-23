//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Body of `PUT /push/subscriptions`: the browser's `PushSubscription.toJSON()` without `expirationTime`.
 * Registers the calling device for pushes about notices put into its identity's inbox.
 */
export const PushSubscribeRequestSchema = Schema.Struct({
  /** URL of the browser's push service; EDGE accepts known push service hosts only. */
  endpoint: Schema.String,
  keys: Schema.Struct({
    /** Base64url P-256 public key the message is encrypted to (RFC 8291). */
    p256dh: Schema.String,
    /** Base64url 16-byte auth secret. */
    auth: Schema.String,
  }),
  /** Push a test notification to this device once registered, so the user can check it arrives. */
  test: Schema.optional(Schema.Boolean),
});
export type PushSubscribeRequest = Schema.Schema.Type<typeof PushSubscribeRequestSchema>;

/**
 * Body of `DELETE /push/subscriptions`.
 */
export const PushUnsubscribeRequestSchema = Schema.Struct({
  endpoint: Schema.String,
});
export type PushUnsubscribeRequest = Schema.Schema.Type<typeof PushUnsubscribeRequestSchema>;

/**
 * Body of `PUT /push/senders`: the identity DIDs whose notices are pushed to this identity's devices, replacing any
 * earlier list. EDGE still stores notices from anyone else; it just does not push them. At most 1000 DIDs.
 */
export const PushSendersRequestSchema = Schema.Struct({
  senders: Schema.Array(Schema.String),
});
export type PushSendersRequest = Schema.Schema.Type<typeof PushSendersRequestSchema>;

/**
 * Response of `GET /push/vapid-public-key`; EDGE answers 404 when push is not configured.
 */
export const VapidPublicKeyResponseSchema = Schema.Struct({
  /** Base64url uncompressed P-256 point: the `applicationServerKey` to subscribe with. */
  publicKey: Schema.String,
});
export type VapidPublicKeyResponse = Schema.Schema.Type<typeof VapidPublicKeyResponseSchema>;

/**
 * The data of a push event, as EDGE encrypts it to the subscription.
 */
export const PushMessageSchema = Schema.Struct({
  v: Schema.Literal(1),
  /** Id of the inbox notice (a random id for a test push). */
  id: Schema.String,
  senderDid: Schema.String,
  /** Epoch milliseconds. */
  sentAt: Schema.Number,
  /** The notice's opaque payload; absent when it would not fit in one push message. */
  payload: Schema.optional(Schema.String),
  /** Set on the test notification sent for a `test` subscribe, which has no notice behind it. */
  test: Schema.optional(Schema.Literal(true)),
});
export type PushMessage = Schema.Schema.Type<typeof PushMessageSchema>;
