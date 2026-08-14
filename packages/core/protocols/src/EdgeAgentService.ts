//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for the EDGE agent service (formerly `dxos.client.services.EdgeAgentService`).
 * All methods take no payload; responses reuse the shared `QueryEdgeStatusResponse` /
 * `QueryAgentStatusResponse` proto types.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('queryEdgeStatus', {
    success: protoMessage('dxos.client.services.QueryEdgeStatusResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('createAgent', {
    error: serviceError,
  }),
  Rpc.make('queryAgentStatus', {
    success: protoMessage('dxos.client.services.QueryAgentStatusResponse'),
    error: serviceError,
    stream: true,
  }),
).prefix('EdgeAgentService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `EdgeAgentService` RPC handlers.
 */
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/EdgeAgentService') {}
