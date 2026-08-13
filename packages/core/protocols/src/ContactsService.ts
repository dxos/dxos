//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.client.services.ContactsService`.
 * Shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('getContacts', {
    success: protoMessage('dxos.client.services.ContactBook'),
    error: serviceError,
  }),
  Rpc.make('queryContacts', {
    success: protoMessage('dxos.client.services.ContactBook'),
    error: serviceError,
    stream: true,
  }),
).prefix('ContactsService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `ContactsService` RPC handlers.
 */
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/ContactsService') {}
