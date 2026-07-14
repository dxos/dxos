//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import { serviceError } from './service-rpc.ts';

//
// RPC message schemas.
//

export const StartRequest = Schema.Struct({
  origin: Schema.String,
  /** Key for the iframe resource lock used to determine when the service is closing. */
  lockKey: Schema.optional(Schema.String),
});
export interface StartRequest extends Schema.Schema.Type<typeof StartRequest> {}

/**
 * Iframe-to-worker RPCs.
 *
 * Effect RPC definitions for the iframe/tab -> worker control channel (`dxos.iframe.WorkerService`).
 * Runs natively over the system {@link MessagePort}, replacing the legacy protobuf peer.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('start', {
    payload: StartRequest,
    error: serviceError,
  }),
  Rpc.make('stop', {
    error: serviceError,
  }),
).prefix('WorkerService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
