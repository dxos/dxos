//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Rpc from 'effect/rpc/Rpc';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import * as Fact from '@dxos/echo-memory/Fact';
import * as MemoryQuery from '@dxos/echo-memory/MemoryQuery';
import * as MemoryService from '@dxos/echo-memory/MemoryService';
import * as Subscription from '@dxos/echo-memory/Subscription';
import { SpaceId } from '@dxos/keys';

import { serviceError } from './service-rpc.ts';

const Space = Schema.Struct({ spaceId: SpaceId });

export const PutRequest = Schema.Struct({
  spaceId: SpaceId,
  facts: Schema.Array(Fact.Fact),
  options: Schema.optional(MemoryService.PutOptions),
});
export interface PutRequest extends Schema.Schema.Type<typeof PutRequest> {}

export const PutResponse = Schema.Struct({ queued: Schema.Number });

export const QueryRequest = Schema.Struct({ spaceId: SpaceId, query: MemoryQuery.Any });
export interface QueryRequest extends Schema.Schema.Type<typeof QueryRequest> {}

/** The answer encoded with the result schema its query's kind names; the caller decodes it the same way. */
export const QueryResponse = Schema.Struct({ result: Schema.Unknown });

export const SubscribeRequest = Schema.Struct({ spaceId: SpaceId, subscription: Subscription.Subscription });
export const SubscribeResponse = Schema.Struct({ added: Schema.Boolean });

export const SubscriptionsRequest = Schema.Struct({ spaceId: SpaceId, owner: Schema.optional(Fact.EntityKey) });
export const SubscriptionsResponse = Schema.Struct({ subscriptions: Schema.Array(Subscription.Subscription) });

export const OutboxRequest = Schema.Struct({ spaceId: SpaceId, id: Subscription.SubscriptionId });
export const UnsubscribeResponse = Schema.Struct({ removed: Schema.Boolean });
export const TakeResponse = Schema.Struct({ events: Schema.Array(Subscription.MemoryEvent) });

export const AckRequest = Schema.Struct({
  spaceId: SpaceId,
  id: Subscription.SubscriptionId,
  events: Schema.Array(Subscription.MemoryEventId),
});

/**
 * Effect RPC definitions for a space's memory (`@dxos/echo-memory`), served by the client services host, which runs
 * the memory beside the space's store; each call names the space whose memory it reads or writes.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('put', { payload: PutRequest, success: PutResponse, error: serviceError }),
  Rpc.make('query', { payload: QueryRequest, success: QueryResponse, error: serviceError }),
  Rpc.make('reset', { payload: Space, error: serviceError }),
  Rpc.make('subscribe', { payload: SubscribeRequest, success: SubscribeResponse, error: serviceError }),
  Rpc.make('subscriptions', { payload: SubscriptionsRequest, success: SubscriptionsResponse, error: serviceError }),
  Rpc.make('unsubscribe', { payload: OutboxRequest, success: UnsubscribeResponse, error: serviceError }),
  Rpc.make('take', { payload: OutboxRequest, success: TakeResponse, error: serviceError }),
  Rpc.make('ack', { payload: AckRequest, error: serviceError }),
).prefix('MemoryService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `MemoryService` RPC handlers.
 */
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/MemoryService') {}
