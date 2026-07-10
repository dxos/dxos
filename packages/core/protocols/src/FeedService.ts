//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.client.services.FeedService`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('queryFeed', {
    payload: protoMessage('dxos.client.services.QueryFeedRequest'),
    success: protoMessage('dxos.client.services.FeedQueryResult'),
    error: serviceError,
  }),
  Rpc.make('insertIntoFeed', {
    payload: protoMessage('dxos.client.services.InsertIntoFeedRequest'),
    error: serviceError,
  }),
  Rpc.make('deleteFromFeed', {
    payload: protoMessage('dxos.client.services.DeleteFromFeedRequest'),
    error: serviceError,
  }),
  Rpc.make('syncFeed', {
    payload: protoMessage('dxos.client.services.SyncFeedRequest'),
    error: serviceError,
  }),
  Rpc.make('getSyncState', {
    payload: protoMessage('dxos.client.services.GetSyncStateRequest'),
    success: protoMessage('dxos.client.services.GetSyncStateResponse'),
    error: serviceError,
  }),
).prefix('FeedService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
