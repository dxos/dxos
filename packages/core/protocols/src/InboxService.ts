//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import { serviceError } from './service-rpc.ts';
import { mutableArray, protoTimestamp, publicKey } from './service-schemas.ts';
import { SpaceMemberRole } from './SpacesService.ts';

//
// RPC message schemas.
//

export const SendRequest = Schema.Struct({
  recipientIdentityKey: publicKey,
  spaceKey: publicKey,
  role: SpaceMemberRole,
});
export interface SendRequest extends Schema.Schema.Type<typeof SendRequest> {}

/**
 * A space invitation notice whose signature, sender, recipient and age have been verified.
 */
export const Notice = Schema.Struct({
  /** Credential id of the signed notice; the dedupe key and the handle passed to `ack`. */
  id: Schema.String,
  senderIdentityKey: publicKey,
  spaceKey: publicKey,
  role: SpaceMemberRole,
  sentAt: protoTimestamp,
});
export interface Notice extends Schema.Schema.Type<typeof Notice> {}

/**
 * The full set of pending notices; emitted whole so an ack on another device removes entries too.
 */
export const Notices = Schema.Struct({
  notices: mutableArray(Notice),
});
export interface Notices extends Schema.Schema.Type<typeof Notices> {}

export const AckRequest = Schema.Struct({
  /** Notice ids ({@link Notice.id}). */
  ids: mutableArray(Schema.String),
});
export interface AckRequest extends Schema.Schema.Type<typeof AckRequest> {}

/**
 * Effect RPC definitions for the client inbox service: user-to-user notices relayed through EDGE.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('send', {
    payload: SendRequest,
    error: serviceError,
  }),
  Rpc.make('subscribe', {
    success: Notices,
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
