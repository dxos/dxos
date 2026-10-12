//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Rpc from 'effect/rpc/Rpc';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import { serviceError } from './service-rpc.ts';

/** Lowercase hex SHA-256 digest of the blob's bytes. */
const Key = Schema.String;

export const PutRequest = Schema.Struct({
  key: Key,
  data: Schema.Uint8Array,
  contentType: Schema.optional(Schema.String),
});
export interface PutRequest extends Schema.Schema.Type<typeof PutRequest> {}

export const KeyRequest = Schema.Struct({ key: Key });
export interface KeyRequest extends Schema.Schema.Type<typeof KeyRequest> {}

export const GetResponse = Schema.Struct({
  /** Absent when neither this device nor the hosted store holds the key. */
  blob: Schema.optional(Schema.Struct({ data: Schema.Uint8Array, contentType: Schema.optional(Schema.String) })),
});
export interface GetResponse extends Schema.Schema.Type<typeof GetResponse> {}

export const HasResponse = Schema.Struct({ exists: Schema.Boolean });
export interface HasResponse extends Schema.Schema.Type<typeof HasResponse> {}

/**
 * Effect RPC definitions for the device-local, content-addressed blob store held in the client
 * services' database. A `put` is confirmed once the bytes are stored locally; the host replicates them
 * to the hosted store asynchronously, and fills a `get` that misses locally from it.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('put', { payload: PutRequest, error: serviceError }),
  Rpc.make('get', { payload: KeyRequest, success: GetResponse, error: serviceError }),
  Rpc.make('has', { payload: KeyRequest, success: HasResponse, error: serviceError }),
).prefix('BlobStoreService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `BlobStoreService` RPC handlers.
 */
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/BlobStoreService') {}
