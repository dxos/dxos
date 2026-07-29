//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';

import { protoMessage, serviceError } from './service-rpc.ts';
import { mutableArray } from './service-schemas.ts';

//
// RPC message schemas.
//

export const QueryDevicesResponse = Schema.Struct({
  devices: Schema.optional(mutableArray(protoMessage('dxos.client.services.Device'))),
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

/**
 * Effect service tag for the `DevicesService` RPC handlers.
 */
export class Tag extends Context.Tag('@dxos/protocols/rpc/DevicesService')<Tag, Handlers>() {}
