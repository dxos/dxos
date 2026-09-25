//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import * as Contract from '@dxos/automerge-proxy/Contract';

import { serviceError } from './service-rpc.ts';
import { mutableArray } from './service-schemas.ts';

//
// Document sync for clients that keep proxies of documents instead of Automerge replicas. The payloads
// are `@dxos/automerge-proxy`'s contract; this service adds the subscription and the space around them.
//

export const SubscribeRequest = Schema.Struct({
  subscriptionId: Schema.String,
  /** Random per tab session; tags this tab's batches in the log and in Automerge change messages. */
  clientId: Schema.String,
  spaceId: Schema.String,
});
export interface SubscribeRequest extends Schema.Schema.Type<typeof SubscribeRequest> {}

export const UpdateSubscriptionRequest = Schema.Struct({
  subscriptionId: Schema.String,
  /** Documents to follow, with what the tab already holds when it is resubscribing. */
  add: Schema.optional(mutableArray(Contract.Follow)),
  remove: Schema.optional(mutableArray(Schema.String)),
});
export interface UpdateSubscriptionRequest extends Schema.Schema.Type<typeof UpdateSubscriptionRequest> {}

export const SubmitRequest = Schema.Struct({
  subscriptionId: Schema.String,
  batches: mutableArray(Contract.SubmitBatch),
});
export interface SubmitRequest extends Schema.Schema.Type<typeof SubmitRequest> {}

export const SubmitResponse = Schema.Struct({ results: mutableArray(Contract.SubmitResult) });
export interface SubmitResponse extends Schema.Schema.Type<typeof SubmitResponse> {}

export const ResolveCursorsResponse = Schema.Struct({ positions: mutableArray(Schema.NullOr(Schema.Number)) });
export interface ResolveCursorsResponse extends Schema.Schema.Type<typeof ResolveCursorsResponse> {}

export const CreateCursorsResponse = Schema.Struct({ cursors: mutableArray(Schema.NullOr(Schema.String)) });
export interface CreateCursorsResponse extends Schema.Schema.Type<typeof CreateCursorsResponse> {}

export class Rpcs extends RpcGroup.make(
  /** Stream of document events for the documents a subscription follows. */
  Rpc.make('subscribe', {
    payload: SubscribeRequest,
    success: Contract.EventBatch,
    error: serviceError,
    stream: true,
  }),
  Rpc.make('updateSubscription', {
    payload: UpdateSubscriptionRequest,
    error: serviceError,
  }),
  /** Applies tab batches; resolves once they are saved and their entries are on the stream. */
  Rpc.make('submit', {
    payload: SubmitRequest,
    success: SubmitResponse,
    error: serviceError,
  }),
  /** Positions of Automerge cursors (comments, remote presence) in a text. */
  Rpc.make('resolveCursors', {
    payload: Contract.ResolveCursors,
    success: ResolveCursorsResponse,
    error: serviceError,
  }),
  /** Automerge cursors for positions a tab saw (new anchors, the local selection). */
  Rpc.make('createCursors', {
    payload: Contract.CreateCursors,
    success: CreateCursorsResponse,
    error: serviceError,
  }),
).prefix('MirrorService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/MirrorService') {}
