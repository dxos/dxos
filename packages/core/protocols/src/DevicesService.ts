//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import { DeviceSchema } from './buf/proto/gen/dxos/client/services_pb.ts';
import { DeviceProfileDocumentSchema } from './buf/proto/gen/dxos/halo/credentials_pb.ts';
import { bufMessage, serviceError } from './service-rpc.ts';
import { mutableArray } from './service-schemas.ts';

//
// RPC message schemas.
//

export const QueryDevicesResponse = Schema.Struct({
  devices: Schema.optional(mutableArray(bufMessage(DeviceSchema))),
});
export interface QueryDevicesResponse extends Schema.Schema.Type<typeof QueryDevicesResponse> {}

/**
 * Effect RPC definitions for `dxos.client.services.DevicesService`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('updateDevice', {
    payload: bufMessage(DeviceProfileDocumentSchema),
    success: bufMessage(DeviceSchema),
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
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/DevicesService') {}
