//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.client.services.DevicesService`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('updateDevice', {
    payload: protoMessage('dxos.halo.credentials.DeviceProfileDocument'),
    success: protoMessage('dxos.client.services.Device'),
    error: serviceError,
  }),
  Rpc.make('queryDevices', {
    success: protoMessage('dxos.client.services.QueryDevicesResponse'),
    error: serviceError,
    stream: true,
  }),
).prefix('DevicesService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
