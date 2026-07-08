import { RpcGroup, Rpc, type RpcClient } from '@effect/rpc';
import * as Schema from 'effect/Schema';

import * as EchoPb from './proto/gen/dxos/echo/service';

export class Rpcs extends RpcGroup.make(
  Rpc.make('subscribe', {
    payload: Schema.declare<EchoPb.SubscribeRequest>((_): _ is EchoPb.SubscribeRequest => true),
    success: Schema.declare<EchoPb.BatchedDocumentUpdates>((_): _ is EchoPb.BatchedDocumentUpdates => true),
    stream: true,
  }),
  Rpc.make('updateSubscription', {
    payload: Schema.declare<EchoPb.UpdateSubscriptionRequest>((_): _ is EchoPb.UpdateSubscriptionRequest => true),
  }),
  Rpc.make('createDocument', {
    payload: Schema.declare<EchoPb.CreateDocumentRequest>((_): _ is EchoPb.CreateDocumentRequest => true),
    success: Schema.declare<EchoPb.CreateDocumentResponse>((_): _ is EchoPb.CreateDocumentResponse => true),
  }),
  Rpc.make('update', {
    payload: Schema.declare<EchoPb.UpdateRequest>((_): _ is EchoPb.UpdateRequest => true),
  }),
  Rpc.make('flush', {
    payload: Schema.declare<EchoPb.FlushRequest>((_): _ is EchoPb.FlushRequest => true),
  }),
  Rpc.make('getDocumentHeads', {
    payload: Schema.declare<EchoPb.GetDocumentHeadsRequest>((_): _ is EchoPb.GetDocumentHeadsRequest => true),
    success: Schema.declare<EchoPb.GetDocumentHeadsResponse>((_): _ is EchoPb.GetDocumentHeadsResponse => true),
  }),
  Rpc.make('waitUntilHeadsReplicated', {
    payload: Schema.declare<EchoPb.WaitUntilHeadsReplicatedRequest>(
      (_): _ is EchoPb.WaitUntilHeadsReplicatedRequest => true,
    ),
  }),
  Rpc.make('reIndexHeads', {
    payload: Schema.declare<EchoPb.ReIndexHeadsRequest>((_): _ is EchoPb.ReIndexHeadsRequest => true),
  }),
  Rpc.make('updateIndexes', {}),
  Rpc.make('subscribeSpaceSyncState', {
    payload: Schema.declare<EchoPb.GetSpaceSyncStateRequest>((_): _ is EchoPb.GetSpaceSyncStateRequest => true),
    success: Schema.declare<EchoPb.SpaceSyncState>((_): _ is EchoPb.SpaceSyncState => true),
    stream: true,
  }),
).prefix('DataService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}
