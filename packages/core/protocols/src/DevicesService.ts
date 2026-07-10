//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

//
// RPC message schemas.
//

export const QueryDevicesResponse = Schema.Struct({
  devices: Schema.Array(protoMessage('dxos.client.services.Device')),
});
export interface QueryDevicesResponse extends Schema.Schema.Type<typeof QueryDevicesResponse> {}

/**
 * Effect RPC definitions for `dxos.client.services.DevicesService`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('updateDevice', {
    payload: protoMessage('dxos.halo.credentials.DeviceProfileDocument'),
    success: protoMessage('dxos.client.services.Device'),
    error: serviceError,
  }),
  Rpc.make('queryDevices', {
    success: QueryDevicesResponse,
    error: serviceError,
    stream: true,
  }),
).prefix('DevicesService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
