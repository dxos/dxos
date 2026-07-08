//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.client.services.EdgeAgentService`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
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
