//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Rpc from 'effect/rpc/Rpc';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import { serviceError } from './service-rpc.ts';
import { mutableArray, protoTimestamp, publicKey } from './service-schemas.ts';

/** Payload type of an `org.dxos.type.message` Message, JSON-encoded with its Effect Schema. */
export const INBOX_MESSAGE_TYPE = 'org.dxos.inbox.message';

//
// RPC message schemas.
//

export const SendMessageRequest = Schema.Struct({
  recipientIdentityKey: publicKey,
  /** Reverse-DNS payload type (e.g., {@link INBOX_MESSAGE_TYPE}). */
  type: Schema.String,
  payload: Schema.String,
});
export interface SendMessageRequest extends Schema.Schema.Type<typeof SendMessageRequest> {}

/**
 * A message whose signature, sender, recipient and age have been verified.
 */
export const InboxMessage = Schema.Struct({
  /** Digest of the signed envelope; the dedupe key and the handle passed to `ack`. */
  id: Schema.String,
  senderIdentityKey: publicKey,
  type: Schema.String,
  payload: Schema.String,
  sentAt: protoTimestamp,
});
export interface InboxMessage extends Schema.Schema.Type<typeof InboxMessage> {}

/**
 * Whether EDGE relays this identity's inbox: `account-required` while the identity is not linked to an account.
 */
export const Status = Schema.Literals(['available', 'account-required']);
export type Status = Schema.Schema.Type<typeof Status>;

/**
 * The full set of pending messages; emitted whole so an ack on another device removes entries too.
 */
export const Messages = Schema.Struct({
  messages: mutableArray(InboxMessage),
  /** Absent means `available`. */
  status: Schema.optional(Status),
});
export interface Messages extends Schema.Schema.Type<typeof Messages> {}

export const AckRequest = Schema.Struct({
  /** Message ids ({@link InboxMessage.id}). */
  ids: mutableArray(Schema.String),
});
export interface AckRequest extends Schema.Schema.Type<typeof AckRequest> {}

/**
 * Effect RPC definitions for the client inbox service: user-to-user messages relayed through EDGE.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('sendMessage', {
    payload: SendMessageRequest,
    error: serviceError,
  }),
  Rpc.make('subscribe', {
    success: Messages,
    error: serviceError,
    stream: true,
  }),
  Rpc.make('ack', {
    payload: AckRequest,
    error: serviceError,
  }),
).prefix('InboxService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `InboxService` RPC handlers.
 */
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/InboxService') {}
